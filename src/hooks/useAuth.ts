"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import type { User } from "@/types/auth";

export function useAuth() {
  const supabase = getSupabaseBrowser();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true; // Prevent state updates after unmount

    async function loadUser() {
      try {
        const params = new URLSearchParams(window.location.search);

        // 🔥 BLOCK AUTH LOGIC DURING PASSWORD RECOVERY
        if (
          params.get("type") === "recovery" ||
          params.has("access_token") ||
          params.has("token_hash")
        ) {
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // 🔥 NORMAL LOGIN FLOW
        const { data: authData, error: authError } = await supabase.auth.getUser();

        // Handle auth errors
        if (authError) {
          console.error("Auth error:", authError);
          if (isMounted) {
            setError(authError.message);
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // No user found
        if (!authData?.user) {
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        const authUser = authData.user;

        // 🔥 Load full user profile from users table
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (profileError) {
          console.error("Failed to load user profile:", profileError);
          if (isMounted) {
            setError("Failed to load user profile");
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // Ensure profile exists and has all required fields
        if (!profile) {
          console.error("Profile not found for user:", authUser.id);
          if (isMounted) {
            setError("User profile not found");
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // Set the complete user object
        if (isMounted) {
          setUser({
            id: profile.id,
            email: profile.email,
            first_name: profile.first_name || "",
            last_name: profile.last_name || "",
            role: profile.role,
            club_name: profile.club_name || null,
            phone: profile.phone || null,
            is_active: profile.is_active ?? true,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
          });
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        console.error("Unexpected error in loadUser:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setUser(null);
          setLoading(false);
        }
      }
    }

    loadUser();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const getFullName = () => {
    if (!user) return "";
    return `${user.first_name} ${user.last_name}`.trim();
  };

  const getDisplayInfo = () => {
    if (!user) return null;
    return {
      first_name: user.first_name,
      last_name: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`,
      role: user.role,
      club_name: user.club_name,
      email: user.email,
      is_active: user.is_active,
    };
  };

  return {
    user,
    loading,
    error,
    signOut,
    isAuthenticated: !!user && !error,
    getFullName,
    getDisplayInfo,
  };
}