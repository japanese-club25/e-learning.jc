import { NextRequest, NextResponse } from "next/server";
import { validateLoginRequest, ValidationError } from "@/service/auth";
import prisma from "@/config/prisma";
import bcrypt from "bcryptjs";
import { TokenService } from "@/service/auth/services/token.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = validateLoginRequest(body);

    const userAgent = request.headers.get("user-agent") || undefined;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || 
                      request.headers.get("x-real-ip") || 
                      undefined;

    const student = await prisma.student.findUnique({
      where: { email: validatedData.email }
    });

    if (!student || !student.password_hash) {
       return NextResponse.json(
         { success: false, message: "Invalid email or password" },
         { status: 401 }
       );
    }

    const isValidPassword = await bcrypt.compare(validatedData.password, student.password_hash);

    if (!isValidPassword) {
       return NextResponse.json(
         { success: false, message: "Invalid email or password" },
         { status: 401 }
       );
    }

    const tokenData = await TokenService.createToken({
       studentId: student.id,
       expiresInDays: 7,
       userAgent,
       ipAddress,
    });

    const response = NextResponse.json({
       success: true,
       message: "Login successful",
       user: {
         id: student.id,
         email: student.email,
         role: "student",
         isFirstLogin: student.is_first_login
       }
    });

    response.cookies.set({
        name: 'auth_token',
        value: tokenData.token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;

  } catch (error) {
    console.error("Student Login API error:", error);
    if (error instanceof ValidationError || (error instanceof Error && error.message.includes("Validation failed"))) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
