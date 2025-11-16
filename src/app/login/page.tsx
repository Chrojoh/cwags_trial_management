"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Lookup email by username
      const { data: userRow, error: lookupErr } = await supabase
        .from("users")
        .select("email")
        .eq("username", username.trim())
        .single();

      if (lookupErr || !userRow) {
        setError("Invalid username or password.");
        return;
      }

      // Step 2: Supabase Auth login
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: userRow.email,
        password: password.trim(),
      });

      if (signInErr) {
        setError("Invalid username or password.");
        return;
      }

      // Step 3: Redirect after session is set
      router.replace(searchParams.get("callbackUrl") ?? "/dashboard");
    } catch (err) {
      console.error(err);
      setError("Unexpected error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {/* your UI here */}
    </form>
  );
}
