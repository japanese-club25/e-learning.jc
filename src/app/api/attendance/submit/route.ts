import { NextResponse } from "next/server";

// Attendance submissions must use a server-issued QR token.
export async function POST() {
  return NextResponse.json(
    { success: false, message: "QR scan is required. Use the student attendance scanner.", type: "QR_REQUIRED" },
    { status: 410 },
  );
}
