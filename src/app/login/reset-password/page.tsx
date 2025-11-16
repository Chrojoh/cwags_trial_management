"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ResetPasswordPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = searchParams.get("access_token");

  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setStatus("error");
    }
  }, [accessToken]);

  const handleReset = async (e: any) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password.trim(),
    });

    if (error) {
      console.error(error);
      setStatus("error");
    } else {
      setStatus("done");
      setTimeout(() => router.replace("/login"), 1800);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white shadow-md rounded p-6 w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold text-center">Reset Password</h1>

        {status === "error" && (
          <p className="text-red-600 text-center">
            Invalid or expired password reset link.
          </p>
        )}

        {status === "done" && (
          <p className="text-green-600 text-center">
            Password updated! Redirecting…
          </p>
        )}

        {status === "idle" && (
          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="password"
              placeholder="New password"
              className="w-full border p-2 rounded"
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white p-2 rounded"
            >
              {loading ? "Updating…" : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
