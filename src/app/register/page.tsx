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
  const [error, setError] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) return setError(signUpError.message);

  await supabase.from("users").insert([
  {
    id: data.user?.id,
    email,
    first_name: first,
    last_name: last,
    role: "trial_secretary",
  }
]);


    router.push("/login");
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg space-y-3">
      <h1 className="text-xl font-semibold">Create Account</h1>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="w-full border px-3 py-2 rounded"
          placeholder="First Name" required value={first}
          onChange={(e) => setFirst(e.target.value)}
        />

        <input className="w-full border px-3 py-2 rounded"
          placeholder="Last Name" required value={last}
          onChange={(e) => setLast(e.target.value)}
        />

        <input className="w-full border px-3 py-2 rounded" type="email"
          placeholder="Email Address" required value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input className="w-full border px-3 py-2 rounded" type="password"
          placeholder="Password" minLength={6} required value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full bg-orange-600 text-white p-2 rounded">
          Register
        </button>
      </form>
    </div>
  );
}
