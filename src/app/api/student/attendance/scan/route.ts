import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/config/prisma";
import { requireStudentReady } from "@/service/auth/guards";
import { hashAttendanceQrToken } from "@/lib/attendance-qr";
import { calculateDistance, DEFAULT_RADIUS_METERS, isValidCoordinate } from "@/utils/geofence";
import { hashFingerprint, isValidFingerprint } from "@/utils/fingerprintHasher";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStudentReady();
    if (auth.response) return auth.response;
    const body = await request.json();
    const qrToken = typeof body.qr_token === "string" ? body.qr_token.trim() : "";
    const deviceId = typeof body.device_id === "string" ? body.device_id.trim() : "";
    const { latitude, longitude } = body;
    if (!qrToken || !deviceId || !isValidFingerprint(deviceId)) {
      return NextResponse.json({ success: false, message: "QR token and valid device ID are required" }, { status: 400 });
    }

    const token = await prisma.meetingQrToken.findUnique({
      where: { token_hash: hashAttendanceQrToken(qrToken) },
      include: { meeting: true },
    });
    if (!token || token.is_revoked || (token.expires_at && token.expires_at <= new Date())) {
      return NextResponse.json({ success: false, message: "QR code is invalid or expired", type: "INVALID_QR" }, { status: 403 });
    }

    const meeting = token.meeting;
    const now = new Date();
    if (!meeting.is_active) return NextResponse.json({ success: false, message: "Meeting is inactive", type: "MEETING_INACTIVE" }, { status: 403 });
    if (meeting.starts_at && now < meeting.starts_at) return NextResponse.json({ success: false, message: "Meeting has not started", type: "MEETING_NOT_STARTED" }, { status: 403 });
    if (meeting.ends_at && now > meeting.ends_at) return NextResponse.json({ success: false, message: "Meeting has ended", type: "MEETING_ENDED" }, { status: 403 });

    const geofenceEnabled = meeting.latitude !== null && meeting.longitude !== null;
    let distance: number | null = null;
    if (geofenceEnabled) {
      if (!isValidCoordinate(latitude, longitude)) return NextResponse.json({ success: false, message: "Valid location is required", type: "LOCATION_REQUIRED" }, { status: 400 });
      distance = calculateDistance(latitude, longitude, meeting.latitude!, meeting.longitude!);
      if (distance > (meeting.radius ?? DEFAULT_RADIUS_METERS)) return NextResponse.json({ success: false, message: "You are outside the attendance radius", type: "OUT_OF_RADIUS", distance, radius: meeting.radius }, { status: 403 });
    }

    const fingerprintHash = hashFingerprint(deviceId);
    const duplicate = await prisma.attendance.findFirst({ where: { OR: [
      { student_id: auth.user.id, meeting_id: meeting.id },
      { device_id: deviceId, meeting_id: meeting.id },
      { fingerprint_hash: fingerprintHash, meeting_id: meeting.id },
    ] } });
    if (duplicate) return NextResponse.json({ success: false, message: "Attendance already recorded", type: "DUPLICATE" }, { status: 409 });

    const student = await prisma.student.findUnique({ where: { id: auth.user.id }, select: { id: true, name: true, class: true } });
    const admin = await prisma.adminUser.findFirst({ select: { id: true } });
    if (!student || !admin) return NextResponse.json({ success: false, message: "System is not configured" }, { status: 500 });
    const status = meeting.starts_at && (now.getTime() - meeting.starts_at.getTime()) > 15 * 60 * 1000 ? "TERLAMBAT" : "HADIR";
    const attendance = await prisma.attendance.create({ data: {
      student_id: student.id, meeting_id: meeting.id, status,
      scanned_admin_id: admin.id, device_id: deviceId, fingerprint_hash: fingerprintHash,
      latitude: isValidCoordinate(latitude, longitude) ? latitude : null,
      longitude: isValidCoordinate(latitude, longitude) ? longitude : null,
      distance,
    } });
    return NextResponse.json({ success: true, message: "Attendance recorded", attendance, meeting: { id: meeting.id, title: meeting.title } }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ success: false, message: "Attendance already recorded", type: "DUPLICATE" }, { status: 409 });
    console.error("Student QR attendance error:", error);
    return NextResponse.json({ success: false, message: "Failed to record attendance" }, { status: 500 });
  }
}
