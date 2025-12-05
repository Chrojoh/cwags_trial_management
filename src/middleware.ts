import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;
  const params = url.searchParams;

  // -------------------------------------------------------
  // 🔥 1. Allow Supabase recovery links IMMEDIATELY
  // -------------------------------------------------------
  if (params.get("type") === "recovery") {
    return NextResponse.next(); // VERY IMPORTANT
  }

  // Allow any URL that includes Supabase tokens
  if (params.has("token_hash") || params.has("access_token")) {
    return NextResponse.next();
  }

  // Allow the reset-password page to load
  if (pathname.startsWith("/login/reset-password")) {
    return NextResponse.next();
  }

  // -------------------------------------------------------
  // Continue normally for all other requests
  // -------------------------------------------------------
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          );
        },
      },
    }
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
