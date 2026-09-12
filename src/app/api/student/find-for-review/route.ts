import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { requireStudentReady } from "@/service/auth/guards";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStudentReady();
    if (auth.response) return auth.response;
    const { examCode } = await request.json();

    if (!examCode) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Exam code is required" 
        },
        { status: 400 }
      );
    }

    // Identity comes from the authenticated session, never from the request.
    const student = await prisma.student.findFirst({
      where: {
        id: auth.user.id,
        exam_code: examCode.trim()
      },
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
          message: "No exam results found for the provided name and exam code. Please check your details and try again." 
        },
        { status: 404 }
      );
    }

    if (!student.is_submitted) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Exam not completed yet. Review will be available after you submit your exam." 
        },
        { status: 403 }
      );
    }

    // Check if exam has ended
    const exam = await prisma.exam.findUnique({
      where: { exam_code: examCode.trim() }
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

    const now = new Date();
    if (exam.end_time && now < exam.end_time) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Exam is still ongoing. Review will be available after the exam period ends." 
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Student found! Redirecting to review...",
      studentId: student.id,
      examCode: student.exam_code,
      studentName: student.name,
      examName: exam.name
    });

  } catch (error) {
    console.error("Find student for review error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error" 
      },
      { status: 500 }
    );
  }
}
