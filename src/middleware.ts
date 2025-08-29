// src/middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow access to auth pages
  if (pathname.startsWith('/auth/')) {
    return NextResponse.next()
  }
  
  // Allow access to API auth routes
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }
  
  // For now, allow all other requests (we'll add auth check later)
  // TODO: Add proper authentication check once auth is working
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - auth (auth pages)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)",
  ],
}