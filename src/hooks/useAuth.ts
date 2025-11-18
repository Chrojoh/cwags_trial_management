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
      const { data, error } = await supabase.auth.getUser()

      if (error || !data?.user) {
        setUser(null)
      } else {
     setUser({
  id: data.user.id,
  email: data.user.email ?? "",
  username: data.user.user_metadata?.username ?? "",  // 🔹 added
  first_name: data.user.user_metadata?.first_name ?? "",
  last_name: data.user.user_metadata?.last_name ?? "",
  role: data.user.user_metadata?.role ?? "trial_secretary",
  club_name: data.user.user_metadata?.club_name ?? "",
  is_active: true
})

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
    if (!user) return null
    return {
      fullName: getFullName(),
      role: user.role,
      club_name: user.club_name,
      email: user.email,
      is_active: user.is_active,
    }
  }

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
    getFullName,
    getDisplayInfo
  }
}
