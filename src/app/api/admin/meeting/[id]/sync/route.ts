import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { sendSyncToGas } from "@/lib/gas-sync";
import { cookies } from "next/headers";
import { TokenService } from "@/service/auth/services/token.service";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return TokenService.validateToken(token);
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // Auth check
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Check GAS is configured before touching DB
  if (!process.env.GAS_WEB_APP_URL || !process.env.GAS_SYNC_TOKEN) {
    return NextResponse.json(
      { success: false, error: "GAS integration not configured (GAS_WEB_APP_URL / GAS_SYNC_TOKEN missing)" },
      { status: 503 }
    );
  }

  // Prevent duplicate concurrent syncs
  const existing = await prisma.meeting.findUnique({
    where: { id },
    select: { id: true, sync_status: true },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "Meeting not found" }, { status: 404 });
  }

  if (existing.sync_status === "SYNCING") {
    return NextResponse.json(
      { success: false, error: "Sync already in progress. Please wait." },
      { status: 409 }
    );
  }

  const startedAt = new Date();

  // Lock: mark as SYNCING so duplicate clicks are blocked
  await prisma.meeting.update({
    where: { id },
    data: { sync_status: "SYNCING", sync_error: null },
  });

  try {
    // Fetch full source-of-truth data
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        attendances: {
          include: { student: true },
          orderBy: { recorded_at: "asc" },
        },
      },
    });

    if (!meeting) throw new Error("Meeting not found after lock");

    const payload = {
      token: process.env.GAS_SYNC_TOKEN!,
      action: "sync_meeting" as const,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        starts_at: meeting.starts_at?.toISOString() ?? null,
        ends_at: meeting.ends_at?.toISOString() ?? null,
        created_at: meeting.created_at.toISOString(),
      },
      attendance: meeting.attendances.map((att) => ({
        student_id: att.student.id,
        name: att.student.name,
        class: att.student.class,
        status: att.status,
        recorded_at: att.recorded_at.toISOString(),
        device_id: att.device_id,
        reason: att.reason ?? null,
      })),
    };

    const result = await sendSyncToGas(payload);
    const duration = Date.now() - startedAt.getTime();

    if (result.success) {
      await prisma.meeting.update({
        where: { id },
        data: {
          sync_status: "SYNCED",
          last_synced_at: new Date(result.syncedAt),
          google_sheet_id: result.sheetId,
          google_sheet_name: result.sheetName,
          sync_error: null,
        },
      });

      console.log(`[GAS_SYNC] meeting=${id} user=${user.userId} rows=${result.syncedRows} duration=${duration}ms`);

      return NextResponse.json({
        success: true,
        meetingId: id,
        sheetId: result.sheetId,
        sheetName: result.sheetName,
        syncedRows: result.syncedRows,
        syncedAt: result.syncedAt,
        duration,
      });
    } else {
      await prisma.meeting.update({
        where: { id },
        data: { sync_status: "FAILED", sync_error: result.error },
      });

      console.error(`[GAS_SYNC] FAILED meeting=${id} user=${user.userId} error="${result.error}" duration=${duration}ms`);

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 502 }
      );
    }
  } catch (err: any) {
    const duration = Date.now() - startedAt.getTime();
    const errorMsg = err?.message ?? "Unknown error";

    await prisma.meeting.update({
      where: { id },
      data: { sync_status: "FAILED", sync_error: errorMsg },
    });

    console.error(`[GAS_SYNC] ERROR meeting=${id} user=${user.userId} error="${errorMsg}" duration=${duration}ms`);

    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
