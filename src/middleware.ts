// src/middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // PUBLIC ROUTES - No authentication required
  if (pathname.startsWith('/auth/') ||
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/entries/') ||  // ← PUBLIC ENTRY FORMS
      pathname.startsWith('/api/public/') // ← PUBLIC API ENDPOINTS
  ) {
    return NextResponse.next()
  }
  
  // PROTECTED ROUTES - Check for authentication
  // Dashboard and admin routes require login
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
    const user = request.cookies.get('cwags_user');
    
    if (!user) {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)",
  ],
}