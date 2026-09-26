import { NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { generateAttendanceCode, hashAttendanceCode } from "@/lib/attendance-code";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({ where: { id }, select: { id: true } });
  if (!meeting) return NextResponse.json({ success: false, message: "Meeting not found" }, { status: 404 });
  const code = generateAttendanceCode();
  await prisma.meeting.update({ where: { id }, data: { attendance_code_hash: hashAttendanceCode(code), attendance_code_created_at: new Date() } });
  return NextResponse.json({ success: true, attendance_code: code });
}
