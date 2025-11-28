"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function ResetHandler() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.push("/login/reset-password");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  return null;
}
