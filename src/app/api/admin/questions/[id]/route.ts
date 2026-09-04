import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { Category, Option } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-guard";
import {
  deleteQuestionImage,
  uploadQuestionImage,
  validateImageFile,
} from "@/lib/cloudinary";

// GET single question
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id } = await params;
    const question = await prisma.question.findUnique({
      where: { id },
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

    if (!question) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Question not found" 
        },
        { status: 404 }
      );
    }

    // Transform question to include exams information
    const transformedQuestion = {
      ...question,
      exams: question.exam_questions.map(eq => eq.exam),
      category: question.exam_questions[0]?.exam?.category || null
    };

    return NextResponse.json({
      success: true,
      question: transformedQuestion
    });

  } catch (error) {
    console.error("Get question error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch question" 
      },
      { status: 500 }
    );
  }
}

// PUT update question
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let uploadedPublicId: string | null = null;

  try {
    // Auth first: never touch Cloudinary on behalf of an anonymous caller.
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id } = await params;

    const contentType = request.headers.get("content-type") || "";
    const isMultipart = contentType.includes("multipart/form-data");

    let exam_ids: string[] | undefined;
    let question_text: string | undefined;
    let option_a: string | undefined;
    let option_b: string | undefined;
    let option_c: string | undefined;
    let option_d: string | undefined;
    let correct_option: Option | undefined;
    let explanation: string | undefined;
    let newImage: File | null = null;
    let removeImage = false;

    if (isMultipart) {
      const form = await request.formData();

      // ponytail: empty list means "not provided", so multipart cannot detach
      // every exam. The admin UI already requires >= 1 exam. Add an explicit
      // flag field if detach-all ever becomes a real requirement.
      const formExamIds = form.getAll("exam_ids").map(String).filter(Boolean);
      exam_ids = formExamIds.length > 0 ? formExamIds : undefined;
      question_text = form.get("question_text")?.toString();
      option_a = form.get("option_a")?.toString();
      option_b = form.get("option_b")?.toString();
      option_c = form.get("option_c")?.toString();
      option_d = form.get("option_d")?.toString();
      correct_option = form.get("correct_option")?.toString() as Option | undefined;
      explanation = form.get("explanation")?.toString();
      removeImage = form.get("remove_image")?.toString() === "true";

      const image = form.get("image");
      if (image instanceof File && image.size > 0) {
        const invalid = validateImageFile(image);
        if (invalid) {
          return NextResponse.json(
            { success: false, message: invalid },
            { status: 400 }
          );
        }
        newImage = image;
      }
    } else {
      const body = await request.json();
      exam_ids = body.exam_ids;
      question_text = body.question_text;
      option_a = body.option_a;
      option_b = body.option_b;
      option_c = body.option_c;
      option_d = body.option_d;
      correct_option = body.correct_option;
      explanation = body.explanation;
      removeImage = body.remove_image === true;
    }

    // Check if question exists
    const existingQuestion = await prisma.question.findUnique({
      where: { id }
    });

    if (!existingQuestion) {
      return NextResponse.json(
        { success: false, message: "Question not found" },
        { status: 404 }
      );
    }

    let imageData: { image_url: string | null; image_public_id: string | null } | undefined;

    if (newImage) {
      const uploaded = await uploadQuestionImage(newImage);
      uploadedPublicId = uploaded.publicId;
      imageData = { image_url: uploaded.url, image_public_id: uploaded.publicId };
    } else if (removeImage) {
      imageData = { image_url: null, image_public_id: null };
    }

    // Update the question using transaction
    const question = await prisma.$transaction(async (tx) => {
      // Update question basic data
      await tx.question.update({
        where: { id },
        data: {
          question_text: question_text?.trim(),
          option_a: option_a?.trim(),
          option_b: option_b?.trim(),
          option_c: option_c?.trim(),
          option_d: option_d?.trim(),
          correct_option,
          explanation: explanation?.trim() || null,
          ...(imageData ?? {})
        }
      });

      // Update exam relationships if exam_ids provided
      if (exam_ids !== undefined) {
        // Delete existing exam relationships
        await tx.examQuestion.deleteMany({
          where: { question_id: id }
        });

        // Create new exam relationships
        if (exam_ids && exam_ids.length > 0) {
          await tx.examQuestion.createMany({
            data: exam_ids.map((exam_id: string) => ({
              exam_id,
              question_id: id
            }))
          });
        }
      }

      // Return question with relationships
      return await tx.question.findUnique({
        where: { id },
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
    });

    // Old asset is unreferenced only after the row committed.
    if (imageData && existingQuestion.image_public_id) {
      await deleteQuestionImage(existingQuestion.image_public_id);
    }

    // Transform result to include exams information
    const transformedQuestion = {
      ...question,
      exams: question?.exam_questions.map(eq => eq.exam) || [],
      category: question?.exam_questions[0]?.exam?.category || null
    };

    return NextResponse.json({
      success: true,
      message: "Question updated successfully",
      question: transformedQuestion
    });

  } catch (error) {
    await deleteQuestionImage(uploadedPublicId);
    console.error("Update question error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update question" },
      { status: 500 }
    );
  }
}

// DELETE question
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id } = await params;

    // Check if question exists
    const existingQuestion = await prisma.question.findUnique({
      where: { id }
    });

    if (!existingQuestion) {
      return NextResponse.json(
        { success: false, message: "Question not found" },
        { status: 404 }
      );
    }

    // Delete the question
    await prisma.question.delete({
      where: { id }
    });

    await deleteQuestionImage(existingQuestion.image_public_id);

    return NextResponse.json({
      success: true,
      message: "Question deleted successfully"
    });

  } catch (error) {
    console.error("Delete question error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete question" },
      { status: 500 }
    );
  }
}
