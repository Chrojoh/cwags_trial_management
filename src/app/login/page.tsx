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

    const { data, error: lookupError } = await supabase
      .from("users")
      .select("email")
      .eq("username", username.trim())
      .single();

    if (lookupError || !data?.email) {
      setError("Invalid username or password.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: password.trim(),
    });

    if (signInError) {
      setError("Invalid username or password.");
      return;
    }

    router.replace(searchParams.get("callbackUrl") ?? "/dashboard");
  };

  return (
    <form onSubmit={handleLogin}>
      {/* UI goes here */}
    </form>
  );
}
