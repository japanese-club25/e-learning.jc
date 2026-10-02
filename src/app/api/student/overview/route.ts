import { NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { requireStudentReady } from "@/service/auth/guards";

export async function GET() {
  const auth = await requireStudentReady();
  if (auth.response) return auth.response;
  const studentId = auth.user.id;
  const now = new Date();

  const [attempts, activeExams, attendance, upcomingMeetings] = await Promise.all([
    prisma.examAttempt.findMany({
      where: { student_id: studentId },
      include: {
        exam: { select: { id: true, name: true, exam_code: true, category: true, duration: true, end_time: true } },
      },
      orderBy: { started_at: "desc" },
    }),
    prisma.exam.findMany({
      where: { is_active: true, OR: [{ start_time: null }, { start_time: { lte: now } }], AND: [{ OR: [{ end_time: null }, { end_time: { gte: now } }] }] },
      select: { id: true, name: true, exam_code: true, category: true, duration: true, start_time: true, end_time: true },
      orderBy: { start_time: "asc" },
    }),
    prisma.attendance.findMany({
      where: { student_id: studentId },
      include: { meeting: { select: { id: true, title: true, starts_at: true } } },
      orderBy: { recorded_at: "desc" },
      take: 10,
    }),
    prisma.meeting.findMany({
      where: { is_active: true, starts_at: { gt: now } },
      select: { id: true, title: true, starts_at: true, ends_at: true },
      orderBy: { starts_at: "asc" },
      take: 5,
    }),
  ]);

  const completed = attempts.filter((attempt) => attempt.status === "SUBMITTED");
  const averageScore = completed.length ? completed.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) / completed.length : 0;

  return NextResponse.json({
    success: true,
    summary: {
      active_exams: activeExams.length,
      completed_exams: completed.length,
      in_progress_exams: attempts.filter((attempt) => attempt.status === "IN_PROGRESS").length,
      average_score: Math.round(averageScore * 10) / 10,
      attendance_count: attendance.length,
    },
    active_exams: activeExams,
    exam_history: attempts.map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      score: attempt.score,
      started_at: attempt.started_at,
      finished_at: attempt.finished_at,
      exam: attempt.exam,
      can_review: attempt.status === "SUBMITTED",
    })),
    attendance,
    upcoming_meetings: upcomingMeetings,
  });
}
