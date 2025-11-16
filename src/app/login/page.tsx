"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setError("");
    setLoading(true);

    try {
      // 1️⃣ Lookup email from username
      const { data, error: lookupError } = await supabase
        .from("users")
        .select("email")
        .eq("username", username.trim())
        .single();

      if (lookupError || !data) {
        setError("Invalid username or password.");
        return;
      }

      // 2️⃣ Supabase Auth sign-in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: password.trim(),
      });

      if (signInError) {
        setError("Invalid username or password.");
        return;
      }

      // 3️⃣ Redirect
      router.replace(searchParams.get("callbackUrl") ?? "/dashboard");
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {/* your UI fields here */}
    </form>
  );
}
