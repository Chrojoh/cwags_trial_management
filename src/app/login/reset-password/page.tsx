"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

function ResetPasswordForm() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check if we have recovery parameters in the URL
    const params = new URLSearchParams(window.location.search);
    const hasRecoveryParams = params.get("type") === "recovery" || params.has("token_hash");
    
    console.log("Recovery params detected:", hasRecoveryParams);

    // Detect PASSWORD_RECOVERY event or verify existing session
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event, "Session:", !!session);
      
      // If we have recovery params and any session, we're ready
      if (hasRecoveryParams && session) {
        setReady(true);
      }
      
      // Also check for the PASSWORD_RECOVERY event
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check immediately for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (hasRecoveryParams && session) {
        console.log("Existing recovery session found");
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // First, verify we have a valid session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      console.log("Session check:", sessionData, sessionError); // Debug log
      
      if (sessionError || !sessionData.session) {
        setMessage("Session expired. Please request a new password reset link.");
        setLoading(false);
        return;
      }

      // Now update the password
      const { data, error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      console.log("Update result:", data, error); // Debug log

      if (error) {
        console.error("Password update error:", error);
        setMessage(`Error: ${error.message}`);
        setLoading(false);
        return;
      }

      setMessage("✅ Password updated successfully! Redirecting...");
      
      // Sign out to clear the recovery session
      await supabase.auth.signOut();
      
      // Redirect to login
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err) {
      console.error("Unexpected error:", err);
      setMessage("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
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
        minLength={6}
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-600 text-white py-2 rounded hover:bg-orange-700 disabled:bg-gray-400"
      >
        {loading ? "Updating..." : "Set New Password"}
      </button>

      {message && (
        <p className={`text-center ${message.includes("Error") ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}
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