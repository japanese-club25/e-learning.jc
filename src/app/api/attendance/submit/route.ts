import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { cookies } from "next/headers";
import { hashFingerprint, isValidFingerprint } from "@/utils/fingerprintHasher";
import { calculateDistance, isValidCoordinate, DEFAULT_RADIUS_METERS } from "@/utils/geofence";

// Rate limiting storage (in-memory, untuk production gunakan Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Helper function untuk rate limiting
function checkRateLimit(identifier: string, maxRequests: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    // Reset atau buat baru
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  record.count++;
  return true;
}

// Cleanup rate limit map setiap 5 menit
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 300000);

export async function POST(request: NextRequest) {
  try {
    const { meeting_id, name, class: className, deviceId, latitude, longitude } = await request.json();

    // ===== HASH FINGERPRINT =====
    const fingerprintHash = deviceId ? hashFingerprint(deviceId) : null;

    // ===== RATE LIMITING: Cegah spam request =====
    const rateLimitKey = `${deviceId}_${meeting_id}`;
    if (!checkRateLimit(rateLimitKey, 5, 60000)) { // Max 5 requests per menit
      return NextResponse.json(
        { 
          success: false, 
          message: "Terlalu banyak percobaan. Silakan tunggu beberapa saat.",
          type: "RATE_LIMIT"
        },
        { status: 429 } // Too Many Requests
      );
    }

    // Validasi input
    if (!meeting_id || !name || !className || !deviceId) {
      return NextResponse.json(
        { success: false, message: "Semua field harus diisi termasuk deviceId" },
        { status: 400 }
      );
    }

    // ===== VALIDASI FORMAT DEVICE ID (FINGERPRINT) =====
    if (!isValidFingerprint(deviceId)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Device fingerprint tidak valid. Silakan refresh halaman.",
          type: "INVALID_DEVICE_ID"
        },
        { status: 400 }
      );
    }

    // ===== VALIDASI COOKIE: Cek apakah device ini sudah absen untuk meeting ini =====
    const cookieStore = await cookies();
    const cookieName = `attendance_${meeting_id}_${deviceId}`;
    const existingCookie = cookieStore.get(cookieName);
    
    if (existingCookie) {
      const cookieData = JSON.parse(existingCookie.value);
      return NextResponse.json(
        { 
          success: false, 
          message: `Device ini sudah digunakan untuk absensi oleh ${cookieData.name} (${cookieData.class})`,
          type: "COOKIE_DUPLICATE",
          previousUser: cookieData
        },
        { status: 409 }
      );
    }

    // Cek apakah meeting ada
    const meeting = await prisma.meeting.findUnique({
      where: { id: meeting_id }
    });

    if (!meeting) {
      return NextResponse.json(
        { success: false, message: "Meeting tidak ditemukan" },
        { status: 404 }
      );
    }

    // ===== VALIDASI STATUS MEETING =====
    const now = new Date();
    
    // Cek apakah meeting aktif
    if (!meeting.is_active) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Meeting tidak aktif. Tidak dapat mengisi absensi.",
          type: "MEETING_INACTIVE"
        },
        { status: 403 } // Forbidden
      );
    }

    // Cek apakah meeting sudah berakhir
    if (meeting.ends_at && now > new Date(meeting.ends_at)) {
      // Auto-disable meeting
      await prisma.meeting.update({
        where: { id: meeting_id },
        data: { is_active: false }
      });

      return NextResponse.json(
        { 
          success: false, 
          message: "Meeting telah berakhir. Tidak dapat mengisi absensi.",
          type: "MEETING_ENDED"
        },
        { status: 403 } // Forbidden
      );
    }

    // Cek apakah meeting belum dimulai
    if (meeting.starts_at && now < new Date(meeting.starts_at)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Meeting belum dimulai. Silakan tunggu hingga waktu mulai.",
          type: "MEETING_NOT_STARTED"
        },
        { status: 403 } // Forbidden
      );
    }

    // ===== GPS GEOFENCING =====
    // Radius SELALU dari database/konstanta server, tidak pernah dari client.
    const geofenceEnabled = meeting.latitude !== null && meeting.longitude !== null;
    const radius = meeting.radius ?? DEFAULT_RADIUS_METERS;
    let distance: number | null = null;

    if (geofenceEnabled) {
      if (latitude === undefined || longitude === undefined) {
        return NextResponse.json(
          {
            success: false,
            message: "Lokasi tidak dapat diperoleh. Pastikan GPS aktif dan izinkan akses lokasi.",
            type: "LOCATION_REQUIRED"
          },
          { status: 400 }
        );
      }

      if (!isValidCoordinate(latitude, longitude)) {
        return NextResponse.json(
          {
            success: false,
            message: "Koordinat lokasi tidak valid.",
            type: "INVALID_COORDINATES"
          },
          { status: 400 }
        );
      }

      distance = calculateDistance(
        latitude,
        longitude,
        meeting.latitude as number,
        meeting.longitude as number
      );

      // Satu-satunya aturan geofence. Tanpa toleransi, tanpa accuracy, tanpa pembulatan.
      if (distance > radius) {
        return NextResponse.json(
          {
            success: false,
            message: "Anda berada di luar radius absensi.",
            type: "OUT_OF_RADIUS",
            distance: Math.round(distance * 100) / 100,
            radius
          },
          { status: 403 }
        );
      }
    }
    // Meeting tanpa koordinat: geofence dilewati (existing meetings tetap jalan).

    // Cari atau buat student
    let student = await prisma.student.findFirst({
      where: {
        name: name.trim(),
        class: className.trim()
      }
    });

    // Jika student belum ada, buat baru (dengan data minimal)
    if (!student) {
      student = await prisma.student.create({
        data: {
          name: name.trim(),
          class: className.trim(),
          exam_code: '', // Bisa diisi nanti saat ikut ujian
          category: 'Gengo', // Default category
        }
      });
    }

    // ===== VALIDASI GANDA: USER, DEVICE, DAN FINGERPRINT HASH =====
    // Tentukan rentang waktu untuk "hari ini" (00:00:00 - 23:59:59)
    // now sudah dideklarasi di atas untuk validasi meeting
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Build OR conditions for duplicate checks
    const duplicateConditions: any[] = [
      {
        // Cek User: apakah user ini sudah absen hari ini?
        student_id: student.id,
        meeting_id: meeting_id,
        recorded_at: {
          gte: startOfToday,
          lte: endOfToday
        }
      },
      {
        // Cek Device: apakah device ini sudah digunakan untuk absen hari ini?
        device_id: deviceId,
        meeting_id: meeting_id,
        recorded_at: {
          gte: startOfToday,
          lte: endOfToday
        }
      }
    ];

    // Add fingerprint hash check if available
    if (fingerprintHash) {
      duplicateConditions.push({
        // Cek Fingerprint Hash: apakah fingerprint ini sudah digunakan untuk absen hari ini?
        fingerprint_hash: fingerprintHash,
        meeting_id: meeting_id,
        recorded_at: {
          gte: startOfToday,
          lte: endOfToday
        }
      });
    }

    // Query untuk mencari absensi yang sudah ada hari ini
    // Menggunakan OR untuk cek user ATAU device ATAU fingerprint hash
    const existingAttendance: any = await prisma.attendance.findFirst({
      where: {
        OR: duplicateConditions
      } as any,
      include: {
        student: true
      }
    }) as any;

    // Jika ada record yang cocok, tentukan alasan penolakan
    if (existingAttendance) {
      let errorMessage = "";
      let errorType = "DUPLICATE";
      
      // Cek apakah ini user yang sama
      if (existingAttendance.student_id === student.id) {
        errorMessage = "Anda sudah mengisi absensi untuk meeting ini hari ini";
        errorType = "USER_DUPLICATE";
      } 
      // Cek apakah ini device yang sama
      else if (existingAttendance.device_id === deviceId) {
        errorMessage = `Device ini sudah digunakan untuk absensi hari ini oleh ${existingAttendance?.student?.name} (${existingAttendance?.student?.class})`;
        errorType = "DEVICE_DUPLICATE";
      }
      // Cek apakah ini fingerprint yang sama
      else if (fingerprintHash && existingAttendance.fingerprint_hash === fingerprintHash) {
        errorMessage = `Fingerprint device ini sudah digunakan untuk absensi hari ini oleh ${existingAttendance?.student?.name} (${existingAttendance?.student?.class})`;
        errorType = "FINGERPRINT_DUPLICATE";
      }

      return NextResponse.json(
        { 
          success: false, 
          message: errorMessage,
          type: errorType
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Tentukan status kehadiran berdasarkan waktu
    let status = 'HADIR';
    if (meeting.starts_at) {
      const meetingStart = new Date(meeting.starts_at);
      const diffMinutes = (now.getTime() - meetingStart.getTime()) / (1000 * 60);
      
      if (diffMinutes > 15) {
        status = 'TERLAMBAT';
      }
    }

    // Ambil admin pertama sebagai placeholder untuk scanned_admin_id
    const firstAdmin = await prisma.adminUser.findFirst();
    
    if (!firstAdmin) {
      return NextResponse.json(
        { success: false, message: "Sistem belum dikonfigurasi dengan benar" },
        { status: 500 }
      );
    }

    // ===== BUAT RECORD ABSENSI BARU =====
    const attendance = await prisma.attendance.create({
      data: {
        student_id: student.id,
        meeting_id: meeting_id,
        status: status as any,
        scanned_admin_id: firstAdmin.id,
        device_id: deviceId, // Simpan device ID (raw FingerprintJS ID)
        fingerprint_hash: fingerprintHash, // Simpan hashed fingerprint
        latitude: isValidCoordinate(latitude, longitude) ? latitude : null,
        longitude: isValidCoordinate(latitude, longitude) ? longitude : null,
        distance,
        date: new Date(),
        recorded_at: new Date()
      } as any
    });

    // ===== SET COOKIE: Simpan informasi absensi di cookie =====
    // Cookie ini akan mencegah device yang sama digunakan untuk absen lagi
    const cookieData = {
      name: student.name,
      class: student.class,
      attendanceId: attendance.id,
      timestamp: new Date().toISOString()
    };
    
    // Cookie berlaku sampai akhir hari (23:59:59)
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    cookieStore.set(cookieName, JSON.stringify(cookieData), {
      expires: endOfDay,
      httpOnly: true, // Tidak bisa diakses via JavaScript client
      secure: process.env.NODE_ENV === 'production', // HTTPS only di production
      sameSite: 'strict', // CSRF protection
      path: '/'
    });

    return NextResponse.json({
      success: true,
      message: "Absensi berhasil",
      distance: distance === null ? null : Math.round(distance * 100) / 100,
      attendance: {
        id: attendance.id,
        student_name: student.name,
        class: student.class,
        status: attendance.status,
        recorded_at: attendance.recorded_at
      }
    }, { status: 201 }); // 201 Created

  } catch (error: any) {
    console.error("Submit attendance error:", error);
    
    // Handle unique constraint error
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: "Anda sudah mengisi absensi untuk meeting ini" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: "Gagal mencatat absensi: " + error.message },
      { status: 500 }
    );
  }
}
