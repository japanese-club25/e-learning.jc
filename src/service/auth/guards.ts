import { NextResponse } from "next/server";
import { AuthService } from "@/service/auth";

export async function requireRole(role: "admin" | "student") {
  const user = await AuthService.getCurrentUser();
  if (!user || user.role !== role) {
    return { user: null, response: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }) };
  }
  return { user, response: null };
}

export async function requireStudent() {
  return requireRole("student");
}

export async function requireAdmin() {
  return requireRole("admin");
}

export async function requireAdminUser() {
  return requireAdmin();
}

export async function requireStudentReady() {
  const result = await requireStudent();
  if (!result.user || result.response) return result;
  if (result.user.isFirstLogin) {
    return {
      user: null,
      response: NextResponse.json({ success: false, message: "Password change required", code: "FIRST_LOGIN_REQUIRED" }, { status: 403 }),
    };
  }
  return result;
}
