import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const { username } = await req.json();
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("users")
    .select("email")
    .eq("username", username)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Invalid login" }, { status: 400 });
  }

  return NextResponse.json({ email: data.email });
}
