import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const examCode = searchParams.get('examCode');

    if (!studentId || !examCode) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Student ID and exam code are required" 
        },
        { status: 400 }
      );
    }

    // Cek apakah student sudah submit exam
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        scores: {
          include: {
            exam: true
          }
        }
      }
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

    if (!student.is_submitted) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Exam not yet submitted. Review not available." 
        },
        { status: 403 }
      );
    }

    if (student.exam_code !== examCode) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid exam code for this student" 
        },
        { status: 400 }
      );
    }

    // Get exam details
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

    // Cek apakah exam sudah berakhir
    const now = new Date();
    if (exam.end_time && now < exam.end_time) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Exam is still ongoing. Review will be available after exam ends." 
        },
        { status: 403 }
      );
    }

    // Get all questions dengan jawaban student
    const questions = await prisma.question.findMany({
      where: {
        exam_questions: {
          some: {
            exam: {
              category: student.category
            }
          }
        }
      },
      include: {
        answers: {
          where: {
            student_id: studentId
          }
        },
        exam_questions: {
          include: {
            exam: {
              select: {
                id: true,
                name: true,
                exam_code: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    // Get student's score
    const score = await prisma.score.findFirst({
      where: {
        student_id: studentId,
        exam_id: exam.id
      }
    });

    // Format data untuk review
    const reviewData = questions.map((question, index) => {
      const studentAnswer = question.answers[0];
      
      return {
        id: question.id,
        questionNumber: index + 1,
        question_text: question.question_text,
        image_url: question.image_url,
        options: [
          { id: 'A', text: question.option_a },
          { id: 'B', text: question.option_b },
          { id: 'C', text: question.option_c },
          { id: 'D', text: question.option_d }
        ],
        correct_option: question.correct_option,
        student_answer: studentAnswer?.answer || null,
        is_correct: studentAnswer?.is_correct || false,
        explanation: question.explanation || null
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        exam: {
          id: exam.id,
          name: exam.name,
          exam_code: exam.exam_code,
          category: exam.category,
          duration: exam.duration
        },
        student: {
          id: student.id,
          name: student.name,
          class: student.class,
          category: student.category
        },
        score: score ? {
          score: score.score,
          total_questions: score.total_questions,
          percentage: score.percentage,
          passed: Number(score.percentage) >= 70
        } : null,
        questions: reviewData,
        summary: {
          total_questions: questions.length,
          correct_answers: reviewData.filter(q => q.is_correct).length,
          wrong_answers: reviewData.filter(q => !q.is_correct).length,
          violations: student.violations
        }
      }
    });

  } catch (error) {
    console.error("Exam review error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error" 
      },
      { status: 500 }
    );
  }
}
