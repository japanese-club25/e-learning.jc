import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { isValidCoordinate } from "@/utils/geofence";
import { requireAdmin } from "@/lib/auth-guard";
import { generateAttendanceQrToken, hashAttendanceQrToken } from "@/lib/attendance-qr";
import { generateAttendanceCode, hashAttendanceCode } from "@/lib/attendance-code";

// POST: create a new meeting (generates a unique meeting id and returns a qr payload)
export async function POST(request: NextRequest) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const { title, starts_at, ends_at, latitude, longitude } = await request.json();

    // Koordinat lokasi absensi bersifat opsional. Jika dikirim, keduanya wajib valid.
    const hasCoords = latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null;
    if (hasCoords && !isValidCoordinate(latitude, longitude)) {
      return NextResponse.json(
        { success: false, message: "Koordinat lokasi absensi tidak valid" },
        { status: 400 }
      );
    }

    const meeting = await prisma.meeting.create({
      data: {
        title: title || "Pertemuan baru",
        starts_at: starts_at ? new Date(starts_at) : new Date(),
        ends_at: ends_at ? new Date(ends_at) : null,
        latitude: hasCoords ? latitude : null,
        longitude: hasCoords ? longitude : null,
      }
    });

    const qrToken = generateAttendanceQrToken();
    const attendanceCode = generateAttendanceCode();
    const expiresAt = meeting.ends_at ?? null;
    await prisma.meetingQrToken.create({
      data: { meeting_id: meeting.id, token_hash: hashAttendanceQrToken(qrToken), expires_at: expiresAt },
    });
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { attendance_code_hash: hashAttendanceCode(attendanceCode), attendance_code_created_at: new Date() },
    });
    
    return NextResponse.json({ 
      success: true, 
      meeting, 
      qr_payload: qrToken,
      attendance_code: attendanceCode,
    });
  } catch (error) {
    console.error("Create meeting error:", error);
    return NextResponse.json({ success: false, message: "Failed to create meeting" }, { status: 500 });
  }
}

// GET: list meetings
export async function GET(request: NextRequest) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const meetings = await prisma.meeting.findMany({ 
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: { attendances: true }
        }
      }
    });
    return NextResponse.json({ success: true, meetings });
  } catch (error) {
    console.error("List meetings error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch meetings" }, { status: 500 });
  }
}
