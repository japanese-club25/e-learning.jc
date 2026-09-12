import { NextRequest, NextResponse } from "next/server";

// Note: Token validation against database is done in API routes and server components
// Middleware only checks for token presence (Edge runtime doesn't support Prisma)

export async function middleware(request: NextRequest) {
  // Get the pathname
  const pathname = request.nextUrl.pathname;

  // Define protected routes
  const adminRoutes = ['/dashboard', '/api/admin'];
  const studentRoutes = ['/student'];
  const authRoutes = ['/login'];

  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  const isStudentRoute = studentRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Get the auth token from cookies
  const token = request.cookies.get('auth_token')?.value;

  if (!token && (isAdminRoute || isStudentRoute)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user has a token and trying to access auth routes, 
  // we redirect them. We don't know their role here (edge runtime), 
  // so redirect to a generic endpoint or let them hit /dashboard where it checks role
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (allow login APIs)
     * - api/public
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|api/public|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
