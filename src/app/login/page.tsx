"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center p-10">Loading login…</div>}>
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
      const { data, error: lookupError } = await supabase
        .from("users")
        .select("email")
        .eq("username", username.trim())
        .single();

      if (lookupError || !data) {
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
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8 space-y-6">
        <div className="text-center">
          <div className="w-32 h-16 mx-auto mb-4 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            C-WAGS
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Trial Management System</h1>
          <p className="text-gray-600">Secure sign-in</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded font-semibold hover:bg-blue-700 transition"
          >
            {loading ? "Signing in…" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
