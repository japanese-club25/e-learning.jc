import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";

export async function POST(request: NextRequest) {
  try {
    const { name, class: className, exam_code } = await request.json();

    // Validasi input
    if (!name || !className || !exam_code) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Name, class, and exam code are required" 
        },
        { status: 400 }
      );
    }

    // Cek apakah exam dengan exam_code tersebut ada dan aktif
    const exam = await prisma.exam.findUnique({
      where: { exam_code },
      include: {
        _count: {
          select: {
            scores: true
          }
        }
      }
    });

    if (!exam) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid exam code" 
        },
        { status: 404 }
      );
    }

    if (!exam.is_active) {
      return NextResponse.json(
        { 
          success: false, 
          message: "This exam is not currently active" 
        },
        { status: 400 }
      );
    }

    // Cek apakah exam sudah dimulai atau belum berakhir
    const now = new Date();
    if (exam.start_time && now < exam.start_time) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Exam has not started yet" 
        },
        { status: 400 }
      );
    }

    if (exam.end_time && now > exam.end_time) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Exam has already ended" 
        },
        { status: 400 }
      );
    }

    // Cek apakah student sudah pernah login dengan exam_code yang sama
    const existingStudent = await prisma.student.findFirst({
      where: {
        name,
        class: className,
        exam_code
      }
    });

    if (existingStudent) {
      if (existingStudent.is_submitted) {
        return NextResponse.json(
          { 
            success: false, 
            message: "You have already submitted this exam" 
          },
          { status: 400 }
        );
      }

      // Jika belum submit, update started_at dan return student data
      const updatedStudent = await prisma.student.update({
        where: { id: existingStudent.id },
        data: {
          started_at: existingStudent.started_at || now.toISOString()
        }
      });

      return NextResponse.json({
        success: true,
        message: "Login successful. Continue your exam.",
        student: updatedStudent,
        exam
      });
    }

    // Buat student baru
    const student = await prisma.student.create({
      data: {
        name,
        class: className,
        exam_code,
        started_at: now.toISOString(),
        is_submitted: false,
        violations: 0
      }
    });

    return NextResponse.json({
      success: true,
      message: "Login successful. Good luck with your exam!",
      student,
      exam
    });

  } catch (error) {
    console.error("Student login error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error" 
      },
      { status: 500 }
    );
  }
}
