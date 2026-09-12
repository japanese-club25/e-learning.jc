import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { Category } from "@prisma/client";
import { generateExamCode, validateExamCode } from "@/utils/examCodeGenerator";
import { requireAdmin } from "@/lib/auth-guard";

// GET all exams
export async function GET(request: NextRequest) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as Category | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: any = {};
    
    if (category) {
      where.category = category;
    }

    const [exams, total] = await Promise.all([
      prisma.exam.findMany({
        where,
        include: {
          _count: {
            select: {
              scores: true,
              exam_questions: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.exam.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      exams,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Get exams error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch exams" 
      },
      { status: 500 }
    );
  }
}

// POST create new exam
export async function POST(request: NextRequest) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const body = await request.json();
    const {
      name,
      exam_code,
      category,
      duration,
      start_time,
      end_time
    } = body;

    // Basic validation
    if (!name || !category || !duration) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Name, category and duration are required" 
        },
        { status: 400 }
      );
    }

    // Validate category
    if (!Object.values(Category).includes(category)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid category" 
        },
        { status: 400 }
      );
    }

    // Validate duration
    if (duration < 1 || duration > 180) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Duration must be between 1 and 180 minutes" 
        },
        { status: 400 }
      );
    }

    // Handle exam code
    let finalExamCode: string;
    
    if (exam_code && exam_code.trim()) {
      // Manual exam code provided
      const trimmedCode = exam_code.trim().toUpperCase();
      
      // Validate format
      if (!validateExamCode(trimmedCode)) {
        return NextResponse.json(
          { 
            success: false, 
            message: "Invalid exam code format. Use GNG-YYYY-XXX for Gengo or BNK-YYYY-XXX for Bunka" 
          },
          { status: 400 }
        );
      }
      
      // Check if exam code already exists
      const existingExam = await prisma.exam.findUnique({
        where: { exam_code: trimmedCode }
      });
      
      if (existingExam) {
        return NextResponse.json(
          { 
            success: false, 
            message: "Exam code already exists. Please choose a different code." 
          },
          { status: 400 }
        );
      }
      
      finalExamCode = trimmedCode;
    } else {
      // Auto-generate exam code
      finalExamCode = await generateExamCode(category);
    }

    // Validate times if both are provided
    if (start_time && start_time !== 'null' && end_time && end_time !== 'null') {
      const startDate = new Date(start_time);
      const endDate = new Date(end_time);
      
      if (startDate >= endDate) {
        return NextResponse.json(
          { 
            success: false, 
            message: "End time must be after start time" 
          },
          { status: 400 }
        );
      }
    }

    const examData: any = {
      name,
      exam_code: finalExamCode,
      category,
      duration
    };

    // Only add datetime fields if they are provided and not null
    if (start_time && start_time !== 'null') {
      examData.start_time = new Date(start_time);
    }

    if (end_time && end_time !== 'null') {
      examData.end_time = new Date(end_time);
    }

    const exam = await prisma.exam.create({
      data: examData,
      include: {
        _count: {
          select: {
            scores: true,
            exam_questions: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Exam created successfully",
      exam
    });

  } catch (error) {
    console.error("Create exam error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to create exam" 
      },
      { status: 500 }
    );
  }
}
