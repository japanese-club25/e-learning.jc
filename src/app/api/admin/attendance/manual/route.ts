import { NextRequest, NextResponse } from "next/server";
import { AttendanceStatus } from "@prisma/client";
import prisma from "@/config/prisma";
import { requireAdminUser } from "@/service/auth/guards";

export async function POST(request: NextRequest) {
  const auth = await requireAdminUser();
  if (auth.response) return auth.response;

  try {
    const { meeting_id, student_id, status, reason } = await request.json();
    if (!meeting_id || !student_id || !Object.values(AttendanceStatus).includes(status)) {
      return NextResponse.json({ success: false, message: "Meeting, student, and valid status are required" }, { status: 400 });
    }
    if (status === "IZIN" && (!reason || String(reason).trim().length < 3)) {
      return NextResponse.json({ success: false, message: "Reason is required for excused attendance" }, { status: 400 });
    }

    const [meeting, student] = await Promise.all([
      prisma.meeting.findUnique({ where: { id: meeting_id }, select: { id: true } }),
      prisma.student.findUnique({ where: { id: student_id }, select: { id: true, name: true, class: true } }),
    ]);
    if (!meeting) return NextResponse.json({ success: false, message: "Meeting not found" }, { status: 404 });
    if (!student) return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });

    const attendance = await prisma.attendance.create({
      data: {
        meeting_id,
        student_id,
        status,
        scanned_admin_id: auth.user!.id,
        device_id: "manual-admin",
        reason: reason ? String(reason).trim() : null,
      },
      include: { student: { select: { name: true, class: true } } },
    });
    return NextResponse.json({ success: true, attendance }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ success: false, message: "Student already has attendance for this meeting" }, { status: 409 });
    console.error("Manual attendance error:", error);
    return NextResponse.json({ success: false, message: "Failed to record attendance" }, { status: 500 });
  }
}
