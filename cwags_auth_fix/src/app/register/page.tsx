"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const {
      data: { user },
      error: signUpError,
    } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    });

    if (signUpError || !user) {
      console.error(signUpError);
      setError(signUpError?.message || "Registration failed.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("users").insert({
      id: user.id,
      email: email.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      role: "secretary",
      is_active: true,
    });

    setLoading(false);

    if (profileError) {
      console.error(profileError);
      setError("Account created, but failed to create profile.");
      return;
    }

    setMessage("Account created! You can now log in.");
    setTimeout(() => router.replace("/login"), 1500);
  };

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: 20 }}>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
          required
        />
        <input
          type="text"
          placeholder="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
          required
        />
        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
          required
        />
        <input
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}
      {message && <p style={{ color: "green", marginTop: 10 }}>{message}</p>}

      <p style={{ marginTop: 16 }}>
        Already have an account? <a href="/login">Log in</a>
      </p>
    </div>
  );
}
