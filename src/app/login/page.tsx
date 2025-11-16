"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading login...</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
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

      // 3️⃣ Redirect (with callbackUrl support)
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
      {/* ⭐ Replace with your UI fields later */}
      <input
        type="text"
        placeholder="Username"
        onChange={(e) => setUsername(e.target.value)}
        className="border p-2 block mb-2"
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 block mb-2"
      />

      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      <button type="submit" disabled={loading} className="bg-blue-600 text-white p-2">
        {loading ? "Signing in..." : "Login"}
      </button>
    </form>
  );
}
