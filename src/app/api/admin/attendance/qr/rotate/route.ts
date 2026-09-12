import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import prisma from "@/config/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { generateAttendanceQrToken, hashAttendanceQrToken } from "@/lib/attendance-qr";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { meeting_id } = await request.json();
    const meeting = await prisma.meeting.findUnique({ where: { id: meeting_id } });
    if (!meeting) return NextResponse.json({ success: false, message: "Meeting not found" }, { status: 404 });
    await prisma.meetingQrToken.updateMany({ where: { meeting_id, is_revoked: false }, data: { is_revoked: true } });
    const payload = generateAttendanceQrToken();
    const token = await prisma.meetingQrToken.create({ data: { meeting_id, token_hash: hashAttendanceQrToken(payload), expires_at: meeting.ends_at } });
    const qrCodeImage = await QRCode.toDataURL(payload, { width: 400, margin: 2, errorCorrectionLevel: "H" });
    return NextResponse.json({ success: true, qrCodeImage, payload, tokenId: token.id });
  } catch (error) {
    console.error("Rotate attendance QR error:", error);
    return NextResponse.json({ success: false, message: "Failed to rotate QR code" }, { status: 500 });
  }
}
