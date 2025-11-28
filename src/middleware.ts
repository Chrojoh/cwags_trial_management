import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  const searchParams = request.nextUrl.searchParams;
  const isRecovery = searchParams.get("type") === "recovery";

  // 🔥 Allow Supabase password reset magic link
  if (isRecovery) {
    return response; // let the page load so reset-handler can redirect
  }

  // 🔥 Allow user to visit the actual reset page
  if (pathname.startsWith("/login/reset-password")) {
    return response;
  }



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

  // Optional: protect private routes
  // Example:
  // const isProtected = pathname.startsWith("/dashboard");

  // if (isProtected) {
  //   const {
  //     data: { user },
  //   } = await supabase.auth.getUser();
  //
  //   if (!user) {
  //     return NextResponse.redirect(new URL("/login", request.url));
  //   }
  // }

  return response;
}

export const config = {
  matcher: [
    /*
     Match all paths EXCEPT:
     - _next (Next.js internals)
     - static files
     - favicon
    */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
