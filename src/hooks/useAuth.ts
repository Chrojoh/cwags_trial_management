"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowser } from "@/lib/supabaseBrowser"
import type { User } from "@/types/auth"

export function useAuth() {
  const supabase = getSupabaseBrowser()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      // Get auth session user (session only contains email + ID)
      const { data: authData } = await supabase.auth.getUser()

      if (!authData?.user) {
        setUser(null)
        setLoading(false)
        return
      }

      const authUser = authData.user

      // 🔥 Fetch REAL user profile from public.users — this is the important fix
      const { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single()

      if (error || !profile) {
        console.error("Failed to load user profile:", error)
        setUser(null)
      } else {
        // 🔥 Build full user object from the database
       setUser({
  id: profile.id,
  email: profile.email,
  first_name: profile.first_name,
  last_name: profile.last_name,
  role: profile.role,
  club_name: profile.club_name,
  phone: profile.phone,
  is_active: profile.is_active,
  created_at: profile.created_at,
  updated_at: profile.updated_at,
});

      }

      setLoading(false)
    }

    loadUser()
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const getFullName = () => {
    if (!user) return ""
    return `${user.first_name} ${user.last_name}`.trim()
  }

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
    signOut,
    isAuthenticated: !!user,
    getFullName,
    getDisplayInfo,
  }
}
