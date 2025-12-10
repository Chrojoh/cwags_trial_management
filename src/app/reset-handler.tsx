// src/app/reset-handler.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function ResetHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    let subscription: any = null;

    try {
      // Check URL params first (for immediate redirect)
      const type = searchParams?.get('type');
      const hasTokenHash = searchParams?.has('token_hash');
      const hasAccessToken = searchParams?.has('access_token');

      if (type === 'recovery' || hasTokenHash || hasAccessToken) {
        console.log('Password recovery detected in URL, redirecting...');
        const fullSearch = window.location.search;
        router.push('/login/reset-password' + fullSearch);
        return;
      }

      // Subscribe to auth state changes for runtime events
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        try {
          console.log('Auth state change:', event);
          
          if (event === "PASSWORD_RECOVERY") {
            console.log('PASSWORD_RECOVERY event detected, redirecting...');
            router.push("/login/reset-password");
          }

          // Handle other auth events if needed
          if (event === "SIGNED_OUT") {
            console.log('User signed out');
          }

          if (event === "SIGNED_IN") {
            console.log('User signed in');
          }
        } catch (error) {
          console.error('Error handling auth state change:', error);
        }
      });

      subscription = authSubscription;

    } catch (error) {
      console.error('Error in ResetHandler:', error);
    }

    // Cleanup function
    return () => {
      try {
        if (subscription) {
          subscription.unsubscribe();
        }
      } catch (error) {
        console.error('Error unsubscribing from auth changes:', error);
      }
    };
  }, [router, supabase, searchParams]);

  return null;
}