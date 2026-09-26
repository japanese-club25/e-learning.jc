import { NextRequest, NextResponse } from "next/server";
import { AttendanceStatus } from "@prisma/client";
import prisma from "@/config/prisma";
import { requireAdminUser } from "@/service/auth/guards";

export async function POST(request: NextRequest) {
  const auth = await requireAdminUser();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const meeting_id = body.meeting_id;
    const student_ids: string[] = Array.isArray(body.student_ids) ? Array.from(new Set<string>(body.student_ids.filter((id: unknown): id is string => typeof id === "string"))) : [];
    const status = body.status;
    const reason = body.reason;
    if (!meeting_id || student_ids.length === 0 || student_ids.length > 500 || !Object.values(AttendanceStatus).includes(status)) {
      return NextResponse.json({ success: false, message: "Meeting, student, and valid status are required" }, { status: 400 });
    }
    if (status === "IZIN" && (!reason || String(reason).trim().length < 3)) {
      return NextResponse.json({ success: false, message: "Reason is required for excused attendance" }, { status: 400 });
    }

    const [meeting, students] = await Promise.all([
      prisma.meeting.findUnique({ where: { id: meeting_id }, select: { id: true } }),
      prisma.student.findMany({ where: { id: { in: student_ids } }, select: { id: true, name: true, class: true } }),
    ]);
    if (!meeting) return NextResponse.json({ success: false, message: "Meeting not found" }, { status: 404 });
    if (students.length !== student_ids.length) return NextResponse.json({ success: false, message: "One or more students were not found" }, { status: 404 });

    const existing = await prisma.attendance.findMany({ where: { meeting_id, student_id: { in: student_ids } }, include: { student: { select: { name: true } } } });
    const existingIds = new Set(existing.map((item) => item.student_id));
    const pendingIds = student_ids.filter((id: string) => !existingIds.has(id));
    if (pendingIds.length === 0) return NextResponse.json({ success: true, created: 0, skipped: existing.length, duplicates: existing.map((item) => ({ student_id: item.student_id, name: item.student.name })) });

    await prisma.attendance.createMany({ data: pendingIds.map((student_id: string) => ({ meeting_id, student_id, status, scanned_admin_id: auth.user!.id, device_id: "manual-admin", reason: reason ? String(reason).trim() : null })), skipDuplicates: true });
    return NextResponse.json({ success: true, created: pendingIds.length, skipped: existing.length, duplicates: existing.map((item) => ({ student_id: item.student_id, name: item.student.name })) }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ success: false, message: "Student already has attendance for this meeting" }, { status: 409 });
    console.error("Manual attendance error:", error);
    return NextResponse.json({ success: false, message: "Failed to record attendance" }, { status: 500 });
  }
}
