import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { requireAdmin } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const examId = searchParams.get("exam_id");
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 25)));

  const where: any = {
    ...(examId ? { exam_id: examId } : {}),
    ...(category ? { exam: { category } } : {}),
    ...(search ? { student: { OR: [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { class: { contains: search, mode: "insensitive" } },
    ] } } : {}),
  };

  const [scores, total, exams] = await Promise.all([
    prisma.score.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true, class: true, category: true, violations: true } },
        exam: { select: { id: true, name: true, exam_code: true, category: true } },
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.score.count({ where }),
    prisma.exam.findMany({ select: { id: true, name: true, exam_code: true }, orderBy: { created_at: "desc" } }),
  ]);

  const results = await Promise.all(scores.map(async (score) => {
    const attempt = await prisma.examAttempt.findUnique({
      where: { exam_id_student_id: { exam_id: score.exam_id, student_id: score.student_id } },
      select: { status: true, finished_at: true },
    });
    return {
      id: score.id,
      student: score.student,
      exam: score.exam,
      score: score.score,
      total_questions: score.total_questions,
      percentage: Number(score.percentage),
      violations: score.student.violations,
      status: attempt?.status || "SUBMITTED",
      submitted_at: attempt?.finished_at || score.created_at,
    };
  }));

  return NextResponse.json({ success: true, results, exams, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}
