import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
// import { TimezoneProvider } from '@/contexts/timezone-context'  // Comment out temporarily

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "C-WAGS Trial Management System",
  description: "Modern trial management system for C-WAGS competitions across North America",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}