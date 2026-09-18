import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";

// GET single student
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        scores: {
          include: {
            exam: {
              select: {
                id: true,
                created_at: true
              }
            }
          },
          orderBy: {
            created_at: 'desc'
          }
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                question_text: true,
                correct_option: true,
                option_a: true,
                option_b: true,
                option_c: true,
                option_d: true
              }
            }
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

    return NextResponse.json({
      success: true,
      student
    });

  } catch (error) {
    console.error("Get student error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch student" 
      },
      { status: 500 }
    );
  }
}

// DELETE student
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id }
    });

    if (!existingStudent) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Student not found" 
        },
        { status: 404 }
      );
    }

    // Delete student (this will cascade delete related answers and scores)
    await prisma.student.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: "Student deleted successfully"
    });

  } catch (error) {
    console.error("Delete student error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to delete student" 
      },
      { status: 500 }
    );
  }
}
