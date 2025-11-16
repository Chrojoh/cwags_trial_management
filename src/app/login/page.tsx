"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

function LoginForm() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Enter username and password.");
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Lookup email
      const { data, error: lookupError } = await supabase
        .from("users")
        .select("email")
        .eq("username", username.trim())
        .single();

      if (lookupError || !data?.email) {
        setError("Unknown username.");
        setLoading(false);
        return;
      }

      // 2️⃣ Try auth login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: password.trim(),
      });

      if (signInError) {
        console.log("Auth error:", signInError);
        setError("Invalid username or password.");
        setLoading(false);
        return;
      }

      router.replace(searchParams.get("callbackUrl") ?? "/dashboard");
    } catch (err) {
      console.error(err);
      setError("Unexpected error. Try again.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded shadow-md w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-semibold text-center">Login</h1>

        <input
          type="text"
          placeholder="Username"
          className="w-full border p-2 rounded"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-600 text-center">{error}</p>}

        <button
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded py-2"
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        <a
          href="/login/forgot"
          className="block text-center text-sm text-blue-600"
        >
          Forgot password?
        </a>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={"Loading..."}>
      <LoginForm />
    </Suspense>
  );
}
