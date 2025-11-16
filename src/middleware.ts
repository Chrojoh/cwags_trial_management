import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: any) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // or anon if only public policies
    { cookies: { get: (key) => req.cookies.get(key)?.value } }
  );

  const { data } = await supabase.auth.getSession();
  const session = data.session;

  const isLogin = req.nextUrl.pathname.startsWith("/login");
  if (!session && !isLogin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (session && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}
