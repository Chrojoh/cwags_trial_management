/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    // Optimize PNG images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Updated configuration key
  serverExternalPackages: ['@supabase/supabase-js'],
  typescript: {
    // We'll handle TypeScript errors during development
    ignoreBuildErrors: false,
  },
  eslint: {
    // We'll handle ESLint errors during development
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig