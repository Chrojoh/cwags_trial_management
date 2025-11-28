"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function ResetPasswordForm() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // ✅ Listen for recovery session
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      password: password.trim(),
    });

    if (error) {
      console.error(error);
      setMessage("Error updating password.");
    } else {
      setMessage("Password updated! Redirecting to login...");
      setTimeout(() => router.replace("/login"), 1500);
    }

    setLoading(false);
  };

  if (!ready) {
    return (
      <div className="p-6 text-center">
        <p>Verifying reset link...</p>
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
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-600 text-white py-2 rounded"
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
