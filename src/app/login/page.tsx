"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Only create Supabase client in the browser
    const supabase =
      typeof window !== "undefined" ? createSupabaseBrowserClient() : null;

    if (!supabase) {
      setError("Supabase client unavailable.");
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch("/api/auth/username-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!resp.ok) {
        setError("Invalid username or password.");
        setLoading(false);
        return;
      }

      const { email } = await resp.json();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: password.trim(),
      });

      if (signInError) {
        console.error(signInError);
        setError("Invalid username or password.");
        setLoading(false);
        return;
      }

      router.replace("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Unexpected error logging in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: 20 }}>
      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
