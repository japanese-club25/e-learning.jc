import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { requireStudentReady } from "@/service/auth/guards";

interface UpdateViolationsData {
  violations: number;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStudentReady();
    if (auth.response) return auth.response;
    const { violations }: UpdateViolationsData = await request.json();

    // Validasi input
    if (!Number.isInteger(violations) || violations < 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Student ID and violations count are required" 
        },
        { status: 400 }
      );
    }

    // Cek student
    const student = await prisma.student.findUnique({
      where: { id: auth.user.id }
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

    if (student.is_submitted) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Cannot update violations for submitted exam" 
        },
        { status: 400 }
      );
    }

    // Update violations count
    const updatedStudent = await prisma.student.update({
      where: { id: auth.user.id },
      data: {
        violations: violations
      }
    });

    return NextResponse.json({
      success: true,
      message: "Violations updated successfully",
      data: {
        violations: updatedStudent.violations
      }
    });

  } catch (error) {
    console.error("Update violations error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error" 
      },
      { status: 500 }
    );
  }
}
