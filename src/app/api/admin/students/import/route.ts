import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/config/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { normalizeStudentRow, parseStudentFile } from "@/lib/student-import";

function generatedExamCode() {
  return `STU-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const form = await request.formData();
    const uploaded = form.get("file");
    if (!(uploaded instanceof File)) {
      return NextResponse.json({ success: false, message: "CSV or XLSX file is required" }, { status: 400 });
    }
    if (!/\.(csv|xlsx)$/i.test(uploaded.name)) {
      return NextResponse.json({ success: false, message: "Only CSV and XLSX files are supported" }, { status: 400 });
    }

    const rows = parseStudentFile(uploaded.name, Buffer.from(await uploaded.arrayBuffer()));
    const errors: Array<{ row: number; email?: string; error: string }> = [];
    let created = 0;

    for (const [index, raw] of rows.entries()) {
      try {
        const student = normalizeStudentRow(raw);
        const password = student.password || randomBytes(9).toString("base64url");
        const passwordHash = await bcrypt.hash(password, 10);
        let examCode = student.examCode || generatedExamCode();
        while (await prisma.exam.findUnique({ where: { exam_code: examCode }, select: { id: true } }) || await prisma.student.findFirst({ where: { exam_code: examCode }, select: { id: true } })) {
          examCode = generatedExamCode();
        }

        await prisma.student.create({
          data: {
            name: student.name,
            email: student.email,
            class: student.className,
            category: student.category,
            exam_code: examCode,
            password_hash: passwordHash,
            is_first_login: true,
          },
        });
        created++;
      } catch (error: any) {
        errors.push({ row: index + 2, email: String(raw.email || raw.Email || "") || undefined, error: error?.code === "P2002" ? "email or exam_code already exists" : error.message || "invalid row" });
      }
    }

    return NextResponse.json({ success: true, created, failed: errors.length, errors });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Import failed" }, { status: 400 });
  }
}
