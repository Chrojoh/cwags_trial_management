import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// CHANGE THIS BEFORE DEPLOYING
const DEV_SECRET_KEY = "112268"; // ← replace after testing

// Your admin UUID here:
const ADMIN_USER_ID = "ee4cb5c1-0e7b-4750-9453-907e9d275666";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (key !== DEV_SECRET_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Create a session for the admin user
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "email",
    token: ADMIN_USER_ID, // pseudo token but valid for dev
  });

  if (error) {
    console.error("Dev login failed:", error);
    return new Response("Failed to create session", { status: 500 });
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
