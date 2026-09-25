import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/config/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { TokenService } from "@/service/auth/services/token.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const { password } = await request.json();
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ success: false, message: "Password must be at least 6 characters" }, { status: 400 });
    }
    const password_hash = await bcrypt.hash(password, 10);
    await prisma.student.update({ where: { id }, data: { password_hash, is_first_login: true } });
    await TokenService.revokeAllUserTokens(id);
    return NextResponse.json({ success: true, message: "Password reset successfully. Student must change it on next login." });
  } catch (error: any) {
    if (error?.code === "P2025") return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    console.error("Reset student password error:", error);
    return NextResponse.json({ success: false, message: "Failed to reset password" }, { status: 500 });
  }
}
