import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { requireStudentReady } from "@/service/auth/guards";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStudentReady();
    if (auth.response) return auth.response;
    const user = auth.user;

    const { exam_code } = await request.json();

    if (!exam_code) {
      return NextResponse.json(
        { success: false, message: "Exam code is required" },
        { status: 400 }
      );
    }

    const exam = await prisma.exam.findUnique({
      where: { exam_code },
      include: {
        _count: { select: { scores: true } }
      }
    });

    if (!exam) {
      return NextResponse.json({ success: false, message: "Invalid exam code" }, { status: 404 });
    }

    if (!exam.is_active) {
      return NextResponse.json({ success: false, message: "This exam is not currently active" }, { status: 400 });
    }

    const now = new Date();
    if (exam.start_time && now < exam.start_time) {
      return NextResponse.json({ success: false, message: "Exam has not started yet" }, { status: 400 });
    }

    if (exam.end_time && now > exam.end_time) {
      return NextResponse.json({ success: false, message: "Exam has already ended" }, { status: 400 });
    }

    let student = await prisma.student.findUnique({ where: { id: user.id }});
    
    if (!student) {
        return NextResponse.json({ success: false, message: "Student record not found" }, { status: 404 });
    }

    // Check existing attempt
    const existingAttempt = await prisma.examAttempt.findUnique({
       where: {
          exam_id_student_id: {
             exam_id: exam.id,
             student_id: student.id
          }
       }
    });

    if (existingAttempt) {
       if (existingAttempt.status === 'SUBMITTED') {
          return NextResponse.json({ success: false, message: "You have already submitted this exam" }, { status: 400 });
       }
       // If IN_PROGRESS, allow resume
    } else {
       // Create new attempt
       await prisma.examAttempt.create({
          data: {
             exam_id: exam.id,
             student_id: student.id,
             status: 'IN_PROGRESS'
          }
       });
       
       // Update student started_at if not set (legacy support)
       student = await prisma.student.update({
          where: { id: student.id },
          data: {
             exam_code: exam.exam_code,
             started_at: student.started_at || now.toISOString(),
          }
       });
    }

    return NextResponse.json({
      success: true,
      message: "Exam started. Good luck!",
      student,
      exam
    });

  } catch (error) {
    console.error("Student start exam error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
