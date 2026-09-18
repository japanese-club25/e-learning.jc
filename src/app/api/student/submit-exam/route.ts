import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { Option } from "@prisma/client";
import { requireStudentReady } from "@/service/auth/guards";

interface SubmitExamData {
  examCode: string;
  answers: Array<{
    questionId: string;
    selectedOption: 'A' | 'B' | 'C' | 'D';
  }>;
  violations?: number;
  autoSubmitted?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStudentReady();
    if (auth.response) return auth.response;
    const studentId = auth.user.id;
    const { examCode, answers, violations = 0, autoSubmitted = false }: SubmitExamData = await request.json();

    // Validasi input
    if (!examCode || !answers || !Array.isArray(answers) || !Number.isInteger(violations) || violations < 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Student ID, exam code, and answers are required" 
        },
        { status: 400 }
      );
    }

    // Cek student
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Student not found" 
        },
        { status: 404 }
      );
    }


    // Cek exam
    const exam = await prisma.exam.findUnique({
      where: { exam_code: examCode }
    });

    if (!exam) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Exam not found" 
        },
        { status: 404 }
      );
    }

    const attempt = await prisma.examAttempt.findUnique({
      where: { exam_id_student_id: { exam_id: exam.id, student_id: studentId } },
    });
    if (!attempt) return NextResponse.json({ success: false, message: "Exam attempt not found" }, { status: 400 });
    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ success: false, message: "Exam already submitted" }, { status: 400 });
    }

    // Get all questions with their correct answers
    const questionIds = answers.map(a => a.questionId);
    if (new Set(questionIds).size !== questionIds.length) {
      return NextResponse.json({ success: false, message: "Duplicate questions are not allowed" }, { status: 400 });
    }
    const questions = await prisma.question.findMany({
      where: {
        id: { in: questionIds },
        exam_questions: {
          some: {
            exam_id: exam.id
          }
        }
      },
      select: { id: true, correct_option: true }
    });

    if (questions.length !== answers.length) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Some questions not found or invalid for this exam" 
        },
        { status: 400 }
      );
    }

    // Calculate score
    let correctAnswers = 0;
    interface AnswerData {
        student_id: string;
        question_id: string;
        answer: Option;
        is_correct: boolean;
    }

    const answerData: AnswerData[] = [];

    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) continue;

      const isCorrect = question.correct_option === answer.selectedOption;
      if (isCorrect) correctAnswers++;

      answerData.push({
        student_id: studentId,
        question_id: answer.questionId,
        answer: answer.selectedOption as Option,
        is_correct: isCorrect
      });
    }

    const totalQuestions = questions.length;
    const percentage = totalQuestions === 0 ? 0 : Math.round((correctAnswers / totalQuestions) * 100);

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Insert answers
      await tx.answer.createMany({ data: answerData });

      // Insert score
      const score = await tx.score.upsert({
        where: { student_id_exam_id: { student_id: studentId, exam_id: exam.id } },
        update: {
          score: correctAnswers,
          total_questions: totalQuestions,
          percentage,
        },
        create: {
          student_id: studentId,
          exam_id: exam.id,
          score: correctAnswers,
          total_questions: totalQuestions,
          percentage: percentage
        },
      });

      const submittedAttempt = await tx.examAttempt.updateMany({
        where: { id: attempt.id, status: "IN_PROGRESS" },
        data: { status: "SUBMITTED", finished_at: new Date(), score: correctAnswers },
      });
      if (submittedAttempt.count !== 1) throw new Error("Exam already submitted");

      // Update student as submitted with violations count
      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: {
          violations: violations
        }
      });

      return { score, updatedStudent };
    });

    return NextResponse.json({
      success: true,
      message: autoSubmitted 
        ? "Exam auto-submitted due to violations!" 
        : "Exam submitted successfully!",
      result: {
        score: correctAnswers,
        totalQuestions: totalQuestions,
        percentage: percentage,
        passed: percentage >= 70, // Assuming 70% is passing grade
        violations: violations,
        autoSubmitted: autoSubmitted,
        student: result.updatedStudent
      }
    });

  } catch (error) {
    console.error("Submit exam error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error" 
      },
      { status: 500 }
    );
  }
}
