import { NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { requireStudent } from "@/service/auth/guards";

export async function GET() {
  const auth = await requireStudent();
  if (auth.response) return auth.response;

  const student = await prisma.student.findUnique({
    where: { id: auth.user.id },
    select: { id: true, name: true, email: true, class: true, avatar_url: true, is_first_login: true },
  });
  if (!student) return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
  return NextResponse.json({ success: true, user: { ...student, role: "student" } });
}

export async function PATCH(request: Request) {
  const auth = await requireStudent();
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const className = String(body.class || "").trim();
    if (!name || !className) return NextResponse.json({ success: false, message: "Name and class are required" }, { status: 400 });
    const student = await prisma.student.update({ where: { id: auth.user.id }, data: { name, class: className }, select: { id: true, name: true, email: true, class: true, avatar_url: true, is_first_login: true } });
    return NextResponse.json({ success: true, user: { ...student, role: "student" } });
  } catch (error) {
    console.error("Update student profile error:", error);
    return NextResponse.json({ success: false, message: "Failed to update profile" }, { status: 500 });
  }
}
