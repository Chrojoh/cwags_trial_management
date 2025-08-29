// src/app/api/auth/custom-signin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  console.log('🔍 API CALLED!')
  
  try {
    const body = await request.json()
    console.log('📝 Request body:', body)
    
    const { username, password } = body
    
    if (!username || !password) {
      return NextResponse.json({ 
        success: false, 
        message: 'Username and password are required' 
      }, { status: 400 })
    }

    // Database authentication
    console.log('🔍 Looking up user in database:', username)
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single()

    if (error || !user) {
      console.log('❌ User not found or inactive:', username)
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid username or password' 
      }, { status: 401 })
    }

    // Check password
    console.log('🔐 Verifying password for user:', user.username)
    
    let passwordValid = false
    
    // Handle both hashed and plain text passwords (for transition period)
    if (user.password_hash && user.password_hash.startsWith('$2b$')) {
      // BCrypt hashed password
      passwordValid = await bcrypt.compare(password, user.password_hash)
      console.log('🔐 BCrypt password check:', passwordValid)
    } else if (user.password_hash === password) {
      // Plain text password (temporary fallback)
      passwordValid = true
      console.log('🔐 Plain text password check:', passwordValid)
    }

    if (!passwordValid) {
      console.log('❌ Invalid password for user:', username)
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid username or password' 
      }, { status: 401 })
    }

    // Successful authentication
    console.log('✅ Login successful for user:', user.username)
    
    // Return user data (excluding password_hash)
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      club_name: user.club_name,
      phone: user.phone,
      is_active: user.is_active
    }

    return NextResponse.json({
      success: true,
      user: userData
    })
    
  } catch (error) {
    console.error('💥 API Error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Server error' 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'This endpoint requires POST' }, { status: 405 })
}