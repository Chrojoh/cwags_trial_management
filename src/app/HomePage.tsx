// src/app/HomePage.tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, Trophy, Shield, Clock, MapPin } from 'lucide-react'

export default function HomePage() {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-8 mx-auto mb-4 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
            C-WAGS
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                C-WAGS
              </div>
              <h1 className="ml-3 text-xl font-bold">C-WAGS Trial Management</h1>
            </div>
            <Link href="/auth/signin">
              <Button variant="secondary" className="bg-white text-orange-600 hover:bg-gray-50">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Professional Trial Management
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Streamline Your C-WAGS Competitions
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Complete trial management solution designed specifically for C-WAGS competitions. 
            Handle entries, running orders, scoring, and reporting all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signin">
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
                Get Started
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <Calendar className="h-8 w-8 text-orange-600 mb-2" />
              <CardTitle>Trial Management</CardTitle>
              <CardDescription>
                Create and manage multi-day trials with dynamic class scheduling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Multiple days and classes</li>
                <li>• Judge assignment</li>
                <li>• Fee configuration</li>
                <li>• Custom waivers</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <Users className="h-8 w-8 text-orange-600 mb-2" />
              <CardTitle>Entry Processing</CardTitle>
              <CardDescription>
                Streamlined entry management with C-WAGS validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Online entry forms</li>
                <li>• C-WAGS number validation</li>
                <li>• Fee calculation</li>
                <li>• Entry status tracking</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <Trophy className="h-8 w-8 text-orange-600 mb-2" />
              <CardTitle>Combined Scoring</CardTitle>
              <CardDescription>
                Running orders and score entry on the same page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Drag & drop reordering</li>
                <li>• Real-time score entry</li>
                <li>• Scent & numerical classes</li>
                <li>• Reset round support</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <Shield className="h-8 w-8 text-orange-600 mb-2" />
              <CardTitle>C-WAGS Compliance</CardTitle>
              <CardDescription>
                Built specifically for C-WAGS standards and requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Official class names</li>
                <li>• Proper scoring formats</li>
                <li>• Submission-ready reports</li>
                <li>• Audit trails</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <Clock className="h-8 w-8 text-orange-600 mb-2" />
              <CardTitle>Real-time Updates</CardTitle>
              <CardDescription>
                Make changes during competition with immediate updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Add last-minute entries</li>
                <li>• Remove no-shows</li>
                <li>• Switch regular/FEO</li>
                <li>• Live scoring</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <MapPin className="h-8 w-8 text-orange-600 mb-2" />
              <CardTitle>Multi-Timezone</CardTitle>
              <CardDescription>
                Works seamlessly across North America with proper timezone handling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Automatic timezone detection</li>
                <li>• Consistent date/time display</li>
                <li>• Cross-timezone collaboration</li>
                <li>• Local time scheduling</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-gray-600 mb-6">
            Join trial secretaries across North America who trust C-WAGS Trial Management 
            for their competitions.
          </p>
          <Link href="/auth/signin">
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
              Sign In to Dashboard
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center text-white font-bold text-xs">
                C-WAGS
              </div>
              <span className="ml-2 text-sm">C-WAGS Trial Management System</span>
            </div>
            <div className="text-sm text-gray-400">
              © 2024 C-WAGS. Professional trial management.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}