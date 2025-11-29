"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

function ResetPasswordForm() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check if we have the recovery parameters in URL
    const hasRecoveryParams = 
      searchParams.get("type") === "recovery" && 
      searchParams.has("token_hash");

    if (hasRecoveryParams) {
      console.log("✅ Recovery parameters detected");
      setReady(true);
      return;
    }

    // Also listen for PASSWORD_RECOVERY event as backup
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      console.log("Auth event:", event);
      if (event === "PASSWORD_RECOVERY") {
        console.log("✅ PASSWORD_RECOVERY event received");
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, searchParams]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      password: password.trim(),
    });

    if (error) {
      setMessage("Error updating password: " + error.message);
      setLoading(false);
      return;
    }

    setMessage("Password updated! Redirecting...");
    setTimeout(() => router.replace("/login"), 1500);
  };

  if (!ready) {
    return (
      <div className="p-6 text-center">
        <p>Verifying reset link...</p>
        <p className="text-sm text-gray-500 mt-2">
          If this takes more than 5 seconds, the link may be invalid or expired.
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
        required
        minLength={6}
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