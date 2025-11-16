"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";



function ResetPasswordForm() {
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


  const router = useRouter();
  const searchParams = useSearchParams();

  const accessToken = searchParams.get("access_token");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !accessToken) return;

    setLoading(true);
    setMessage("");

    try {
      // 1️⃣ Exchange token for authenticated session
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(accessToken);
      if (sessionError) {
        console.error(sessionError);
        setMessage("Invalid or expired reset link.");
        setLoading(false);
        return;
      }

      // 2️⃣ Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (updateError) {
        setMessage("Error updating password.");
        console.error(updateError);
      } else {
        setMessage("Password updated! Redirecting to login...");
        setTimeout(() => router.replace("/login"), 1500);
      }
    } catch (err) {
      console.error(err);
      setMessage("Unexpected error. Try again.");
    }

    setLoading(false);
  };

  if (!accessToken) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-semibold">
          Invalid or expired password reset link.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleReset} className="space-y-4 max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold text-center">Reset Password</h1>

      <input
        type="password"
        placeholder="New Password"
        className="w-full p-2 border rounded"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        {loading ? "Updating..." : "Set New Password"}
      </button>

      {message && <p className="text-center">{message}</p>}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-center p-6">Loading...</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
