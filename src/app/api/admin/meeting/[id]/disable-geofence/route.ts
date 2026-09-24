import { NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { requireAdmin } from "@/lib/auth-guard";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await context.params;
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    select: { id: true, latitude: true, longitude: true },
  });

  if (!meeting) {
    return NextResponse.json({ success: false, message: "Meeting not found" }, { status: 404 });
  }

  if (meeting.latitude === null && meeting.longitude === null) {
    return NextResponse.json({ success: false, message: "Geofence is already disabled" }, { status: 409 });
  }

  const updatedMeeting = await prisma.meeting.update({
    where: { id },
    data: { latitude: null, longitude: null },
    select: { id: true, latitude: true, longitude: true },
  });

  return NextResponse.json({
    success: true,
    message: "Geofence disabled permanently",
    meeting: updatedMeeting,
  });
}
