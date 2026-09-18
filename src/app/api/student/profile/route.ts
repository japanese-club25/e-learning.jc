import { NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { requireStudent } from "@/service/auth/guards";

export async function GET() {
  const auth = await requireStudent();
  if (auth.response) return auth.response;

  const student = await prisma.student.findUnique({
    where: { id: auth.user.id },
    select: { id: true, name: true, email: true, class: true, is_first_login: true },
  });
  if (!student) return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
  return NextResponse.json({ success: true, user: { ...student, role: "student" } });
}
