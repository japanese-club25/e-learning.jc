import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/service/auth";
import prisma from "@/config/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user || user.role !== "student") {
       return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
       return NextResponse.json({ success: false, message: "Password must be at least 6 characters" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.student.update({
       where: { id: user.id },
       data: {
          password_hash: passwordHash,
          is_first_login: false
       }
    });

    return NextResponse.json({
       success: true,
       message: "Password changed successfully"
    });

  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
