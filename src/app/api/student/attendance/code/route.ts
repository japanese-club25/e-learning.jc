import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { requireStudentReady } from "@/service/auth/guards";
import { hashAttendanceCode, isValidAttendanceCode } from "@/lib/attendance-code";
import { calculateDistance, DEFAULT_RADIUS_METERS, isValidCoordinate } from "@/utils/geofence";
import { hashFingerprint, isValidFingerprint } from "@/utils/fingerprintHasher";

export async function POST(request: NextRequest) {
  const auth = await requireStudentReady();
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const code = typeof body.attendance_code === "string" ? body.attendance_code.trim() : "";
    const deviceId = typeof body.device_id === "string" ? body.device_id.trim() : "";
    const { latitude, longitude } = body;
    if (!isValidAttendanceCode(code) || !deviceId || !isValidFingerprint(deviceId)) {
      return NextResponse.json({ success: false, message: "A valid 6-digit attendance code and device are required", type: "INVALID_ATTENDANCE_CODE" }, { status: 400 });
    }

    const meeting = await prisma.meeting.findFirst({ where: { attendance_code_hash: hashAttendanceCode(code) } });
    if (!meeting || !meeting.is_active) return NextResponse.json({ success: false, message: "Attendance code is invalid or unavailable", type: "INVALID_ATTENDANCE_CODE" }, { status: 403 });
    const now = new Date();
    if (meeting.starts_at && now < meeting.starts_at) return NextResponse.json({ success: false, message: "Meeting has not started", type: "MEETING_NOT_STARTED" }, { status: 403 });
    if (meeting.ends_at && now > meeting.ends_at) return NextResponse.json({ success: false, message: "Meeting has ended", type: "MEETING_ENDED" }, { status: 403 });

    const geofenceEnabled = meeting.latitude !== null && meeting.longitude !== null;
    let distance: number | null = null;
    if (geofenceEnabled) {
      if (!isValidCoordinate(latitude, longitude)) return NextResponse.json({ success: false, message: "Location is required for this meeting", type: "LOCATION_REQUIRED" }, { status: 400 });
      distance = calculateDistance(latitude, longitude, meeting.latitude!, meeting.longitude!);
      if (distance > (meeting.radius ?? DEFAULT_RADIUS_METERS)) return NextResponse.json({ success: false, message: "You are outside the attendance radius", type: "OUT_OF_RADIUS", distance, radius: meeting.radius }, { status: 403 });
    }

    const fingerprintHash = hashFingerprint(deviceId);
    const duplicate = await prisma.attendance.findFirst({ where: { OR: [{ student_id: auth.user.id, meeting_id: meeting.id }, { device_id: deviceId, meeting_id: meeting.id }, { fingerprint_hash: fingerprintHash, meeting_id: meeting.id }] } });
    if (duplicate) return NextResponse.json({ success: false, message: "Attendance already recorded", type: "DUPLICATE" }, { status: 409 });

    const admin = await prisma.adminUser.findFirst({ select: { id: true } });
    if (!admin) return NextResponse.json({ success: false, message: "System is not configured" }, { status: 500 });
    const status = meeting.starts_at && now.getTime() - meeting.starts_at.getTime() > 15 * 60 * 1000 ? "TERLAMBAT" : "HADIR";
    const attendance = await prisma.attendance.create({ data: { student_id: auth.user.id, meeting_id: meeting.id, status, scanned_admin_id: admin.id, device_id: deviceId, fingerprint_hash: fingerprintHash, latitude: geofenceEnabled ? latitude : null, longitude: geofenceEnabled ? longitude : null, distance } });
    return NextResponse.json({ success: true, message: "Attendance recorded", attendance, meeting: { id: meeting.id, title: meeting.title } }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ success: false, message: "Attendance already recorded", type: "DUPLICATE" }, { status: 409 });
    console.error("Attendance code error:", error);
    return NextResponse.json({ success: false, message: "Failed to record attendance" }, { status: 500 });
  }
}
