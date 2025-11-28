import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;

  // --------------------------------------------
  // 🔥 CRITICAL: Allow Supabase recovery flow
  // --------------------------------------------

  // 1️⃣ Allow URLs that contain the recovery event
  if (searchParams.get("type") === "recovery") {
    return NextResponse.next();
  }

  // 2️⃣ Allow URLs that carry auth tokens
  if (searchParams.has("access_token") || searchParams.has("token_hash")) {
    return NextResponse.next();
  }

  // 3️⃣ Allow the actual reset-password page
  if (pathname.startsWith("/login/reset-password")) {
    return response;
  }

  // --------------------------------------------
  // Supabase SSR Client (unchanged)
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

  // --------------------------------------------
  // (Optional) Protected routes
  // --------------------------------------------
  // Example:
  // const isProtected = pathname.startsWith("/dashboard");
  // if (isProtected) {
  //   const {
  //     data: { user },
  //   } = await supabase.auth.getUser();
  //   if (!user) {
  //     return NextResponse.redirect(new URL("/login", request.url));
  //   }
  // }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
