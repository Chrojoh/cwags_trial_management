"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Lock } from "lucide-react"

// Component that uses useSearchParams - wrapped in Suspense
function SignInForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return

    setIsLoading(true)
    setError("")

    try {
      console.log('🔄 Starting signin process...', { username, callbackUrl })
      
      // Call our custom authentication API
      const response = await fetch('/api/auth/custom-signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: username.trim(),
          password: password.trim()
        }),
      })

      console.log('📡 API Response status:', response.status)
      const data = await response.json()
      console.log('📦 API Response data:', data)

      if (response.ok && data.success) {
        console.log('✅ Login successful, storing user data...')
        
        // Store user session in localStorage temporarily
        localStorage.setItem('cwags_user', JSON.stringify(data.user))
        
        // Verify storage
        const storedUser = localStorage.getItem('cwags_user')
        console.log('💾 Stored user data:', storedUser)
        
        console.log('🚀 Redirecting to:', callbackUrl)
        
        // Redirect to dashboard
        router.push(callbackUrl)
        router.refresh()
      } else {
        console.log('❌ Login failed:', data.message)
        setError(data.message || "Invalid username or password.")
      }
    } catch (error) {
      console.error('💥 Signin error:', error)
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto">
            <div className="w-32 h-16 mx-auto mb-4 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              C-WAGS
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Trial Management System
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Sign in to access the C-WAGS Trial Management System
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
                className="text-base"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading || !username.trim() || !password.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter>
          <div className="text-center text-sm text-gray-500">
            <p>
              Only registered Trial Secretaries and Administrators can access this system.
            </p>
            <p className="mt-2">
              Need access? Contact your C-WAGS Administrator.
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

// Main component with Suspense boundary
export default function SignIn() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div><p className="mt-4 text-gray-600">Loading...</p></div></div>}>
      <SignInForm />
    </Suspense>
  )
}