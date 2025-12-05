'use client'

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { useState } from "react";

export default function DebugUser() {
  const supabase = getSupabaseBrowser();
  const [result, setResult] = useState<any>(null);

  const checkUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    console.log("Debug user result:", data, error);
    setResult({ data, error });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Debug User</h1>
      <button
        onClick={checkUser}
        style={{ padding: "8px 14px", border: "1px solid #444" }}
      >
        Check User
      </button>

      {result && (
        <pre style={{ marginTop: 20, background: "#eee", padding: 12 }}>
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
