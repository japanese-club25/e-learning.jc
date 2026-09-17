import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { cookies } from "next/headers";
import { TokenService } from "@/service/auth/services/token.service";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return TokenService.validateToken(token);
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      starts_at: true,
      ends_at: true,
      is_active: true,
      created_at: true,
      sync_status: true,
      last_synced_at: true,
      google_sheet_id: true,
      google_sheet_name: true,
      sync_error: true,
      _count: { select: { attendances: true } },
    },
  });

  if (!meeting) {
    return NextResponse.json({ success: false, error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, meeting });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await context.params;

  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        _count: { select: { attendances: true, qr_tokens: true } },
      },
    });

    if (!meeting) {
      return NextResponse.json({ success: false, message: "Meeting not found" }, { status: 404 });
    }

    if (meeting.sync_status === "SYNCING") {
      return NextResponse.json(
        { success: false, message: "Meeting is currently syncing. Try again in a moment." },
        { status: 409 }
      );
    }

    const attendanceCount = meeting._count.attendances;
    const qrTokenCount = meeting._count.qr_tokens;

    // Database FK cascade handles Attendance + MeetingQrToken deletion automatically.
    await prisma.meeting.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Meeting and all related data deleted successfully.",
      deleted: {
        meeting_id: id,
        attendance_count: attendanceCount,
        qr_token_count: qrTokenCount,
      },
    });
  } catch (error) {
    console.error("Delete meeting error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete meeting" }, { status: 500 });
  }
}

