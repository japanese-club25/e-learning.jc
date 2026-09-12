import { NextRequest, NextResponse } from "next/server";
import { AuthService, validateLoginRequest, ValidationError } from "@/service/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input using DTO
    const validatedData = validateLoginRequest(body);

    // Get user agent and IP for token metadata
    const userAgent = request.headers.get("user-agent") || undefined;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || 
                      request.headers.get("x-real-ip") || 
                      undefined;

    // Attempt login with token-based auth
    const result = await AuthService.loginAdmin(validatedData, {
      userAgent,
      ipAddress,
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: result.message 
        },
        { status: 401 }
      );
    }

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      message: result.message,
      user: result.user
    });

    // Set auth cookie in response with the database token
    if (result.token) {
      response.cookies.set({
        name: 'auth_token',
        value: result.token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
    }

    return response;

  } catch (error) {
    console.error("Login API error:", error);
    
    if (error instanceof ValidationError || (error instanceof Error && error.message.includes("Validation failed"))) {
      return NextResponse.json(
        { 
          success: false, 
          message: error.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error" 
      },
      { status: 500 }
    );
  }
}
