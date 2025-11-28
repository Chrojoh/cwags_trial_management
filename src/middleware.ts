import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;

  // --------------------------------------------
  // 🔥 CRITICAL: Allow Supabase recovery flow early return
  // --------------------------------------------

  // If the URL contains the recovery event, allow it and STOP processing
  if (searchParams.get("type") === "recovery") {
    return NextResponse.next();  // <-- EARLY RETURN
  }

  // Allow URLs that carry auth tokens
  if (searchParams.has("access_token") || searchParams.has("token_hash")) {
    return NextResponse.next();  // <-- EARLY RETURN
  }

  // Allow the actual reset-password page
  if (pathname.startsWith("/login/reset-password")) {
    return response;             // <-- EARLY RETURN
  }

  // --------------------------------------------
  // ❗ ONLY after recovery is handled, create SSR client
  // --------------------------------------------
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          });
        },
      },
    }
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
