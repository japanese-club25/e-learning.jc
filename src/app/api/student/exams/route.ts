import { NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { requireStudentReady } from "@/service/auth/guards";

export async function GET() {
  const auth = await requireStudentReady();
  if (auth.response) return auth.response;

  const exams = await prisma.exam.findMany({
    where: { is_active: true },
    select: {
      id: true, name: true, exam_code: true, category: true, duration: true,
      start_time: true, end_time: true,
      attempts: { where: { student_id: auth.user.id }, select: { status: true, started_at: true, finished_at: true, score: true } },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({
    success: true,
    exams: exams.map(({ attempts, ...exam }) => ({
      ...exam,
      attempt: attempts[0] ?? null,
      status: attempts[0]?.status ?? "NOT_STARTED",
    })),
  });
}
