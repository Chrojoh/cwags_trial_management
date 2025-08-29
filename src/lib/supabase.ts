// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Fallback to hardcoded values if env vars aren't loading properly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://juefexalidlpgcybtnjw.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1ZWZleGFsaWRscGdjeWJ0bmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0ODI3MTcsImV4cCI6MjA2ODA1ODcxN30.RVAkAoDOWqMhtGspR164t1RLFvoEP5ztuMAk5T5oPJE'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1ZWZleGFsaWRscGdjeWJ0bmp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ4MjcxNywiZXhwIjoyMDY4MDU4NzE3fQ.xOYtvc8Lb5tFLkKXK-umJIdIZHiE4agi4_ixumjPR_4'

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing')
console.log('Supabase Key:', supabaseAnonKey ? 'Found' : 'Missing')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client for browser/client-side operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper function to get server-side client
export const createServerSupabaseClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}

export default supabase