// src/app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/login/reset-password'

  console.log('Auth callback:', { type, token_hash: !!token_hash, next })

  if (token_hash && type) {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Exchange the token_hash for a session
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any
    })

    console.log('Token verification:', { error })

    if (!error) {
      console.log('✅ Token verified, redirecting to:', next)
      // Redirect to the password reset page
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // If there was an error, redirect to login with error
  console.log('❌ Auth callback failed, redirecting to login')
  return NextResponse.redirect(new URL('/login?error=invalid_link', request.url))
}