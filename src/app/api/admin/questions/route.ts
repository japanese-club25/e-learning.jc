import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { Category, Option } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-guard";
import {
  deleteQuestionImage,
  uploadQuestionImage,
  validateImageFile,
} from "@/lib/cloudinary";

// GET all questions
export async function GET(request: NextRequest) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const exam_id = searchParams.get('exam_id');
    const category = searchParams.get('category') as Category | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: any = {};
    
    // Filter by exam_id if provided
    if (exam_id) {
      where.exam_questions = {
        some: {
          exam_id: exam_id
        }
      };
    }
    
    // Filter by category through exam relationship
    if (category) {
      where.exam_questions = {
        some: {
          exam: {
            category: category
          }
        }
      };
    }
    
    if (search) {
      where.OR = [
        { question_text: { contains: search, mode: 'insensitive' } },
        { option_a: { contains: search, mode: 'insensitive' } },
        { option_b: { contains: search, mode: 'insensitive' } },
        { option_c: { contains: search, mode: 'insensitive' } },
        { option_d: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          exam_questions: {
            include: {
              exam: {
                select: {
                  id: true,
                  name: true,
                  exam_code: true,
                  category: true
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.question.count({ where })
    ]);

    // Transform questions to include exams information
    const transformedQuestions = questions.map(question => ({
      ...question,
      exams: question.exam_questions.map(eq => eq.exam),
      // Keep backward compatibility by adding category from first exam
      category: question.exam_questions[0]?.exam?.category || null
    }));

    return NextResponse.json({
      success: true,
      questions: transformedQuestions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Get questions error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

// POST create new question
export async function POST(request: NextRequest) {
  let uploadedPublicId: string | null = null;

  try {
    // Auth first: never touch Cloudinary on behalf of an anonymous caller.
    const denied = await requireAdmin();
    if (denied) return denied;

    const contentType = request.headers.get("content-type") || "";
    const isMultipart = contentType.includes("multipart/form-data");

    let exam_ids: string[] = [];
    let question_text: string | undefined;
    let option_a: string | undefined;
    let option_b: string | undefined;
    let option_c: string | undefined;
    let option_d: string | undefined;
    let correct_option: Option | undefined;
    let explanation: string | undefined;
    let image_url: string | null = null;
    let image_public_id: string | null = null;

    if (isMultipart) {
      const form = await request.formData();

      exam_ids = form.getAll("exam_ids").map(String).filter(Boolean);
      question_text = form.get("question_text")?.toString();
      option_a = form.get("option_a")?.toString();
      option_b = form.get("option_b")?.toString();
      option_c = form.get("option_c")?.toString();
      option_d = form.get("option_d")?.toString();
      correct_option = form.get("correct_option")?.toString() as Option | undefined;
      explanation = form.get("explanation")?.toString();

      const image = form.get("image");
      if (image instanceof File && image.size > 0) {
        const invalid = validateImageFile(image);
        if (invalid) {
          return NextResponse.json(
            { success: false, message: invalid },
            { status: 400 }
          );
        }
        const uploaded = await uploadQuestionImage(image);
        image_url = uploaded.url;
        image_public_id = uploaded.publicId;
        uploadedPublicId = uploaded.publicId;
      }
    } else {
      const body = await request.json();
      exam_ids = Array.isArray(body.exam_ids) ? body.exam_ids : [];
      question_text = body.question_text;
      option_a = body.option_a;
      option_b = body.option_b;
      option_c = body.option_c;
      option_d = body.option_d;
      correct_option = body.correct_option;
      explanation = body.explanation;
    }

    // Validate required fields
    if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_option) {
      await deleteQuestionImage(uploadedPublicId);
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    // Create the question
    const question = await prisma.question.create({
      data: {
        question_text: question_text.trim(),
        option_a: option_a.trim(),
        option_b: option_b.trim(),
        option_c: option_c.trim(),
        option_d: option_d.trim(),
        correct_option,
        explanation: explanation?.trim() || null,
        image_url,
        image_public_id,
        exam_questions: exam_ids && exam_ids.length > 0 ? {
          create: exam_ids.map((exam_id: string) => ({
            exam_id
          }))
        } : undefined
      },
      include: {
        exam_questions: {
          include: {
            exam: {
              select: {
                id: true,
                name: true,
                exam_code: true,
                category: true
              }
            }
          }
        }
      }
    });

    // Transform result to include exams information
    const transformedQuestion = {
      ...question,
      exams: question.exam_questions.map(eq => eq.exam),
      category: question.exam_questions[0]?.exam?.category || null
    };

    return NextResponse.json({
      success: true,
      message: "Question created successfully",
      question: transformedQuestion
    });

  } catch (error) {
    // Orphan cleanup: the asset is only referenced once the row exists.
    await deleteQuestionImage(uploadedPublicId);
    console.error("Create question error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create question" },
      { status: 500 }
    );
  }
}
