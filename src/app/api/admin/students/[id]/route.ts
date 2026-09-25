import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import bcrypt from "bcryptjs";

// GET single student
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
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
  const denied = await requireAdmin();
  if (denied) return denied;
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json();
    const name = body.name === undefined ? undefined : String(body.name).trim();
    const email = body.email === undefined ? undefined : String(body.email).trim().toLowerCase();
    const className = body.class === undefined ? undefined : String(body.class).trim();

    if (name === undefined && email === undefined && className === undefined) {
      return NextResponse.json({ success: false, message: "At least one field is required" }, { status: 400 });
    }
    if (name !== undefined && !name) return NextResponse.json({ success: false, message: "Name cannot be empty" }, { status: 400 });
    if (className !== undefined && !className) return NextResponse.json({ success: false, message: "Class cannot be empty" }, { status: 400 });
    if (email !== undefined && !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ success: false, message: "Invalid email" }, { status: 400 });

    const student = await prisma.student.update({
      where: { id },
      data: { ...(name !== undefined ? { name } : {}), ...(email !== undefined ? { email } : {}), ...(className !== undefined ? { class: className } : {}) },
      select: { id: true, name: true, email: true, class: true, is_first_login: true, created_at: true },
    });
    return NextResponse.json({ success: true, message: "Student updated successfully", student });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ success: false, message: "Email already exists" }, { status: 409 });
    if (error?.code === "P2025") return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    console.error("Update student error:", error);
    return NextResponse.json({ success: false, message: "Failed to update student" }, { status: 500 });
  }
}
