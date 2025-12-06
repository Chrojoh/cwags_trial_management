"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate inputs
    if (!first.trim() || !last.trim()) {
      setLoading(false);
      return setError("First and last name are required");
    }

    if (password !== confirmPassword) {
      setLoading(false);
      return setError("Passwords do not match");
    }

    if (password.length < 6) {
      setLoading(false);
      return setError("Password must be at least 6 characters");
    }

    try {
      console.log("Starting registration for:", email);

      // Step 1: Create auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        console.error("Sign up error:", signUpError);
        throw new Error(signUpError.message);
      }

      if (!data.user) {
        throw new Error("Failed to create user account");
      }

      console.log("Auth user created:", data.user.id);

      // Step 2: Insert into users table with error handling
      const { error: insertError } = await supabase.from("users").insert([
        {
          id: data.user.id,
          email: email.trim(),
          first_name: first.trim(),
          last_name: last.trim(),
          role: "trial_secretary",
        },
      ]);

      if (insertError) {
        console.error("User profile insert error:", insertError);
        // Try to clean up the auth user if profile creation fails
        await supabase.auth.admin.deleteUser(data.user.id);
        throw new Error(`Failed to create user profile: ${insertError.message}`);
      }

      console.log("User profile created successfully:", {
        id: data.user.id,
        email,
        first_name: first.trim(),
        last_name: last.trim(),
      });

      alert(
        "Registration successful! Please check your email to verify your account, then log in."
      );
      router.push("/login");
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow-lg space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
        <p className="text-sm text-gray-600 mt-2">
          Register for C-WAGS Trial Management
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="First Name"
            required
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <input
            className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Last Name"
            required
            value={last}
            onChange={(e) => setLast(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            type="email"
            placeholder="Email Address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <input
            className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            type="password"
            placeholder="Password (minimum 6 characters)"
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password *
          </label>
          <input
            className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            type="password"
            placeholder="Confirm Password"
            minLength={6}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {loading ? "Creating Account..." : "Register"}
        </button>
      </form>

      <div className="text-center pt-4 border-t">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-orange-600 hover:underline font-medium">
            Sign in here
          </a>
        </p>
      </div>
    </div>
  );
}