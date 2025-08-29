// src/hooks/useAuth.ts
"use client"

import { useState, useEffect } from 'react'
import type { User } from '@/types/auth'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored user session
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('cwags_user')
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          // Handle legacy data that might use camelCase
          if (parsedUser.firstName) {
            parsedUser.first_name = parsedUser.firstName
            delete parsedUser.firstName
          }
          if (parsedUser.lastName) {
            parsedUser.last_name = parsedUser.lastName
            delete parsedUser.lastName
          }
          if (parsedUser.clubName) {
            parsedUser.club_name = parsedUser.clubName
            delete parsedUser.clubName
          }
          if (parsedUser.isActive !== undefined) {
            parsedUser.is_active = parsedUser.isActive
            delete parsedUser.isActive
          }
          setUser(parsedUser)
        } catch (error) {
          console.error('Error parsing stored user:', error)
          localStorage.removeItem('cwags_user')
        }
      }
    }
    setLoading(false)
  }, [])

  const signOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cwags_user')
      setUser(null)
      window.location.href = '/'
    }
  }

  // Helper methods for display
  const getFullName = () => {
    if (!user) return ''
    return `${user.first_name || ''} ${user.last_name || ''}`.trim()
  }

  const getDisplayInfo = () => {
    if (!user) return null
    return {
      fullName: getFullName(),
      role: user.role,
      club_name: user.club_name || '',
      email: user.email,
      is_active: user.is_active
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