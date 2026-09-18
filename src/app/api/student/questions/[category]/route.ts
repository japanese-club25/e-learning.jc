import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { requireStudentReady } from "@/service/auth/guards";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const auth = await requireStudentReady();
    if (auth.response) return auth.response;
    const url = new URL(request.url);
    const examCode = url.searchParams.get("examCode");

    if (!examCode) {
      return NextResponse.json({ success: false, message: "Exam code is required" }, { status: 400 });
    }

    const exam = await prisma.exam.findUnique({ where: { exam_code: examCode } });
    if (!exam) return NextResponse.json({ success: false, message: "Exam not found" }, { status: 404 });
    const attempt = await prisma.examAttempt.findUnique({ where: { exam_id_student_id: { exam_id: exam.id, student_id: auth.user.id } } });
    if (!attempt) return NextResponse.json({ success: false, message: "Exam attempt not found" }, { status: 403 });

    // Get questions for the specific category through exam relationship
    const questions = await prisma.question.findMany({
      where: {
        exam_questions: {
          some: {
            exam: { id: exam.id }
          }
        }
      },
      select: {
        id: true,
        question_text: true,
        option_a: true,
        option_b: true,
        option_c: true,
        option_d: true,
        image_url: true,
        // Don't include correct_option for security
        exam_questions: {
          include: {
            exam: {
              select: {
                category: true,
                name: true,
                exam_code: true
              }
            }
          },
          where: {
             exam: { id: exam.id }
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    if (questions.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "No questions found for this exam" 
        },
        { status: 404 }
      );
    }

    // Transform questions to match frontend format
    const transformedQuestions = questions.map((question, index) => ({
      id: question.id,
      questionNumber: index + 1,
      question_text: question.question_text,
      image_url: question.image_url,
      options: [
        { id: "A", text: question.option_a },
        { id: "B", text: question.option_b },
        { id: "C", text: question.option_c },
        { id: "D", text: question.option_d }
      ],
      category: question.exam_questions[0]?.exam?.category,
      exam: question.exam_questions[0]?.exam
    }));

    return NextResponse.json({
      success: true,
      questions: transformedQuestions,
      total: questions.length,
      examCode
    });

  } catch (error) {
    console.error("Get questions error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error" 
      },
      { status: 500 }
    );
  }
}
