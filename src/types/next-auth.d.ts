// src/types/next-auth.d.ts
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'trial_secretary' | 'administrator'
      clubName?: string
      username: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: 'trial_secretary' | 'administrator'
    clubName?: string
    username: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    clubName?: string
    username: string
  }
}