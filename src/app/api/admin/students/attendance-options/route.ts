import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { requireAdmin } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const students = await prisma.student.findMany({
    where: search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { class: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    } : undefined,
    select: { id: true, name: true, class: true, email: true },
    orderBy: { name: "asc" },
    take: 50,
  });

  return NextResponse.json({ success: true, students });
}
