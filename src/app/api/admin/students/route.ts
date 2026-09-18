import { NextRequest, NextResponse } from "next/server";
import prisma from "@/config/prisma";
import { Category } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-guard";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// GET all students
export async function GET(request: NextRequest) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as Category | null;
    const search = searchParams.get('search');
    const status = searchParams.get('status'); // 'submitted', 'in-progress', 'all'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { class: { contains: search, mode: 'insensitive' } },
        { exam_code: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status === 'submitted') {
      where.is_first_login = false;
    } else if (status === 'in-progress') {
      where.is_first_login = true;
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          class: true,
          is_first_login: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.student.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      students,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Get students error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch students" 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const className = String(body.class || '').trim();
    const password = String(body.password || '');

    if (!name || !email || !className || !password) {
      return NextResponse.json({ success: false, message: 'Name, email, class, and password are required' }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ success: false, message: 'Invalid email' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const student = await prisma.student.create({
      data: { name, email, class: className, password_hash, is_first_login: true },
      select: { id: true, name: true, email: true, class: true, is_first_login: true, created_at: true },
    });
    return NextResponse.json({ success: true, student }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ success: false, message: 'Email already exists' }, { status: 409 });
    }
    console.error('Create student error:', error);
    return NextResponse.json({ success: false, message: 'Failed to create student' }, { status: 500 });
  }
}
