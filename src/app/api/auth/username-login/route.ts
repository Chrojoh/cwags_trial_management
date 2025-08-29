// src/app/api/auth/username-login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ 
        success: false, 
        message: 'Username is required' 
      }, { status: 400 })
    }

    // Look up user by username
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.trim())
      .eq('is_active', true)
      .single()

    if (error || !userData) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid username or account not found' 
      }, { status: 401 })
    }

    // Check if user has proper role
    if (!['trial_secretary', 'administrator'].includes(userData.role)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Access denied. Only Trial Secretaries and Administrators can access this system.' 
      }, { status: 403 })
    }

    // Return user info for session creation
    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: `${userData.first_name} ${userData.last_name}`,
        username: userData.username,
        role: userData.role,
        clubName: userData.club_name,
        isActive: userData.is_active
      }
    })

  } catch (error) {
    console.error('Username login error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'An error occurred during authentication' 
    }, { status: 500 })
  }
}