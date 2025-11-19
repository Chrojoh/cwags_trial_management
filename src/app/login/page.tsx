"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    if (data?.user) {
      localStorage.setItem("cwags_user", JSON.stringify(data.user));
      router.push("/dashboard");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-24 p-6 border rounded-lg shadow">
      <h1 className="text-xl font-bold mb-4">Login</h1>

      {error && (
        <p className="mb-3 text-red-600 text-sm border border-red-300 p-2 rounded">
          {error}
        </p>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          required
          className="w-full border p-2 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          required
          minLength={6}
          className="w-full border p-2 rounded"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Sign In
        </button>

        {/* NEW REGISTER LINK */}
        <div className="text-center mt-4">
          <a 
            href="/register" 
            className="text-blue-600 hover:underline"
          >
            Need an account? Register here
          </a>
        </div>
      </form>
    </div>
  );
}

