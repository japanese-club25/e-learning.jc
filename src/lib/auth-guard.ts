import { NextResponse } from "next/server";
import { AuthService } from "@/service/auth";

/**
 * Reject the request unless it carries a valid admin session.
 * Returns a 401 response to return early, or null when the caller may proceed.
 *
 * Middleware cannot do this: its matcher excludes /api, and the Edge runtime
 * cannot reach Prisma to validate the token against the database.
 *
 * ponytail: every AdminUser row is an admin — there is no role column, so
 * authenticated implies authorised. Add a role check here once roles exist.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await AuthService.getCurrentUser();

  if (user?.role === "admin") return null;

  return NextResponse.json(
    { success: false, message: "Unauthorized" },
    { status: 401 }
  );
}
