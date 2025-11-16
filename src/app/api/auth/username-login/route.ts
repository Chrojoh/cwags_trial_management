import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  const { username } = await req.json();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {} } // no cookies needed
  );

  const { data, error } = await supabase
    .from("users")
    .select("email")
    .eq("username", username)
    .single();

  if (error || !data?.email) {
    return NextResponse.json(
      { error: "Invalid username" },
      { status: 400 }
    );
  }

  return NextResponse.json({ email: data.email });
}
