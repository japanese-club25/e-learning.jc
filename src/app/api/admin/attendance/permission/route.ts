import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { cookies } from "next/headers";

/**
 * POST /api/admin/attendance/permission
 * Endpoint untuk admin mencatat izin siswa secara manual
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check untuk memastikan yang mengakses adalah admin
    // For now, we'll proceed without auth check
    
    const { meeting_id, name, class: className, reason } = await request.json();

    // Validasi input
    if (!meeting_id || !name || !className || !reason) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Semua field harus diisi (meeting_id, name, class, reason)" 
        },
        { status: 400 }
      );
    }

    // Validasi panjang reason
    if (reason.trim().length < 10) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Alasan izin minimal 10 karakter" 
        },
        { status: 400 }
      );
    }

    if (reason.trim().length > 500) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Alasan izin maksimal 500 karakter" 
        },
        { status: 400 }
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

    // Cari atau buat student
    let student = await prisma.student.findFirst({
      where: {
        name: name.trim(),
        class: className.trim()
      }
    });

    // Jika student belum ada, buat baru
    if (!student) {
      student = await prisma.student.create({
        data: {
          name: name.trim(),
          class: className.trim(),
          exam_code: '', // Bisa diisi nanti saat ikut ujian
        }
      });
    }

    // Cek apakah sudah ada attendance untuk student dan meeting ini
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        student_id: student.id,
        meeting_id: meeting_id
      }
    });

    if (existingAttendance) {
      return NextResponse.json(
        { 
          success: false, 
          message: `${student.name} sudah memiliki data absensi untuk meeting ini dengan status ${existingAttendance.status}`,
          existingAttendance: {
            status: existingAttendance.status,
            recorded_at: existingAttendance.recorded_at,
            reason: existingAttendance.reason
          }
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Ambil admin pertama sebagai placeholder untuk scanned_admin_id
    // TODO: Ganti dengan admin yang sedang login
    const firstAdmin = await prisma.adminUser.findFirst();
    
    if (!firstAdmin) {
      return NextResponse.json(
        { success: false, message: "Sistem belum dikonfigurasi dengan benar (no admin user)" },
        { status: 500 }
      );
    }

    // Buat record attendance dengan status IZIN
    const attendance = await prisma.attendance.create({
      data: {
        student_id: student.id,
        meeting_id: meeting_id,
        status: 'IZIN',
        scanned_admin_id: firstAdmin.id,
        device_id: 'admin-manual', // Identifier untuk izin yang diisi manual oleh admin
        fingerprint_hash: null, // Tidak ada fingerprint karena diisi manual
        reason: reason.trim(), // Simpan alasan izin
        date: new Date(),
        recorded_at: new Date()
      } as any
    });

    return NextResponse.json({
      success: true,
      message: "Izin berhasil dicatat",
      attendance: {
        id: attendance.id,
        student_name: student.name,
        class: student.class,
        status: attendance.status,
        reason: attendance.reason,
        recorded_at: attendance.recorded_at,
        meeting_title: meeting.title
      }
    }, { status: 201 }); // 201 Created

  } catch (error: any) {
    console.error("Permission submission error:", error);
    
    // Handle unique constraint error
    if (error.code === 'P2002') {
      return NextResponse.json(
        { 
          success: false, 
          message: "Siswa ini sudah memiliki data absensi untuk meeting ini" 
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Gagal mencatat izin: " + error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/attendance/permission
 * Endpoint untuk mendapatkan daftar izin (optional - untuk fitur masa depan)
 */
export async function GET(request: NextRequest) {
  try {
    // Get all IZIN attendances with student and meeting info
    const permissions = await prisma.attendance.findMany({
      where: {
        status: 'IZIN'
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            class: true
          }
        },
        meeting: {
          select: {
            id: true,
            title: true,
            starts_at: true,
            ends_at: true
          }
        }
      },
      orderBy: {
        recorded_at: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      permissions: permissions.map(p => ({
        id: p.id,
        student: p.student,
        meeting: p.meeting,
        reason: p.reason,
        recorded_at: p.recorded_at,
        device_id: p.device_id
      }))
    });

  } catch (error: any) {
    console.error("Get permissions error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Gagal mengambil data izin: " + error.message 
      },
      { status: 500 }
    );
  }
}
