import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";

/**
 * POST /api/attendance/submit-permission
 * Endpoint untuk siswa mengirimkan form izin (tidak hadir)
 * Mirip dengan /api/admin/attendance/permission tapi untuk siswa
 */
export async function POST(request: NextRequest) {
  try {
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

    // Cek apakah meeting ada dan aktif
    const meeting = await prisma.meeting.findUnique({
      where: { id: meeting_id }
    });

    if (!meeting) {
      return NextResponse.json(
        { success: false, message: "Meeting tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validasi status meeting
    const now = new Date();
    
    if (!meeting.is_active) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Meeting tidak aktif. Tidak dapat mengisi izin.",
          type: "MEETING_INACTIVE"
        },
        { status: 403 }
      );
    }

    if (meeting.ends_at && now > new Date(meeting.ends_at)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Meeting telah berakhir. Tidak dapat mengisi izin.",
          type: "MEETING_ENDED"
        },
        { status: 403 }
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
          message: `Anda sudah memiliki data ${existingAttendance.status === 'IZIN' ? 'izin' : 'absensi'} untuk meeting ini`,
          type: "USER_DUPLICATE",
          existingAttendance: {
            status: existingAttendance.status,
            recorded_at: existingAttendance.recorded_at,
            reason: existingAttendance.reason
          }
        },
        { status: 409 }
      );
    }

    // Ambil admin pertama sebagai placeholder untuk scanned_admin_id
    const firstAdmin = await prisma.adminUser.findFirst();
    
    if (!firstAdmin) {
      return NextResponse.json(
        { success: false, message: "Sistem belum dikonfigurasi dengan benar" },
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
        device_id: 'student-permission', // Identifier untuk izin yang diisi siswa sendiri
        fingerprint_hash: null,
        reason: reason.trim(),
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
    }, { status: 201 });

  } catch (error: any) {
    console.error("Student permission submission error:", error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { 
          success: false, 
          message: "Anda sudah memiliki data absensi untuk meeting ini" 
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
