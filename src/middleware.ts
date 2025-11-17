import { NextResponse } from "next/server";
<<<<<<< HEAD
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function middleware(req: any) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;
  const isLoginPage = pathname.startsWith("/login");
  const isDashboard = pathname.startsWith("/dashboard");

  if (!session && isDashboard) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*"],
};

=======
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data } = await supabase.auth.getSession();

  const isAuth = !!data.session;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");

  if (!isAuth && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuth && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
>>>>>>> 2ca8f6ee486a081a0455f3875796285d3314b9aa
