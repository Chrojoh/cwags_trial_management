// src/middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // --- PUBLIC ROUTES (ALWAYS allowed) ---
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/entries") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg)$/)
  ) {
    return NextResponse.next()
  }

  // --- PROTECTED ROUTES (require login) ---
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    // User not logged in -> redirect to signin
    const signinUrl = new URL("/auth/signin", request.url)
    return NextResponse.redirect(signinUrl)
  }

  // User IS logged in -> allow access
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
