import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    // Basic auth logic or hardcoded secret check would be needed here for real security
    const body = await request.json();
    const { students } = body;

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ success: false, message: "Invalid students data array" }, { status: 400 });
    }

    const defaultPassword = "password123";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    
    let createdCount = 0;
    const errors = [];

    for (const student of students) {
        if (!student.email || !student.name || !student.class) {
            errors.push({ email: student.email, error: "Missing required fields" });
            continue;
        }

        try {
            await prisma.student.create({
                data: {
                    email: student.email,
                    name: student.name,
                    class: student.class,
                    password_hash: passwordHash,
                    is_first_login: true,
                }
            });
            createdCount++;
        } catch (e: any) {
            if (e.code === 'P2002') {
                errors.push({ email: student.email, error: "Email already exists" });
            } else {
                errors.push({ email: student.email, error: "Failed to create" });
            }
        }
    }

    return NextResponse.json({
        success: true,
        message: `Created ${createdCount} students. Encountered ${errors.length} errors.`,
        created: createdCount,
        errors
    });

  } catch (error) {
    console.error("Seed students error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
