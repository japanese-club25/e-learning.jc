import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import prisma from "@/config/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { generateAttendanceQrToken, hashAttendanceQrToken } from "@/lib/attendance-qr";

// POST: Generate QR code image for a meeting
export async function POST(request: NextRequest) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const { meeting_id } = await request.json();
    if (!meeting_id) {
      return NextResponse.json(
        { success: false, message: "meeting_id is required" },
        { status: 400 }
      );
    }

    const meeting = await prisma.meeting.findUnique({ where: { id: meeting_id } });
    if (!meeting) return NextResponse.json({ success: false, message: "Meeting not found" }, { status: 404 });
    await prisma.meetingQrToken.updateMany({ where: { meeting_id, is_revoked: false }, data: { is_revoked: true } });
    const payload = generateAttendanceQrToken();
    const token = await prisma.meetingQrToken.create({
      data: { meeting_id, token_hash: hashAttendanceQrToken(payload!), expires_at: meeting.ends_at },
    });
    const qrCodeDataURL = await QRCode.toDataURL(payload, {
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H", // High error correction
    });

    return NextResponse.json({
      success: true,
      qrCodeImage: qrCodeDataURL,
      payload,
      tokenId: token.id,
    });
  } catch (error) {
    console.error("Generate QR code error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}

// GET: Generate QR code for a specific meeting ID from query params
export async function GET(request: NextRequest) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get("meeting_id");

    if (!meetingId) {
      return NextResponse.json(
        { success: false, message: "meeting_id query parameter is required" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, message: "Use POST to generate a QR image without exposing the token" }, { status: 405 });
  } catch (error) {
    console.error("Generate QR code error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
