import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
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
