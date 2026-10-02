import { NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { requireStudent } from "@/service/auth/guards";
import { deleteQuestionImage, uploadStudentAvatar, validateAvatarFile } from "@/lib/cloudinary";

export async function POST(request: Request) {
  const auth = await requireStudent();
  if (auth.response) return auth.response;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ success: false, message: "Image file is required" }, { status: 400 });
  const validation = validateAvatarFile(file);
  if (validation) return NextResponse.json({ success: false, message: validation }, { status: 400 });
  try {
    const current = await prisma.student.findUnique({ where: { id: auth.user.id }, select: { avatar_public_id: true } });
    const uploaded = await uploadStudentAvatar(file);
    const student = await prisma.student.update({ where: { id: auth.user.id }, data: { avatar_url: uploaded.url, avatar_public_id: uploaded.publicId }, select: { id: true, name: true, email: true, class: true, avatar_url: true, is_first_login: true } });
    await deleteQuestionImage(current?.avatar_public_id);
    return NextResponse.json({ success: true, user: { ...student, role: "student" } });
  } catch (error) {
    console.error("Upload student avatar error:", error);
    return NextResponse.json({ success: false, message: "Failed to upload avatar" }, { status: 500 });
  }
}
