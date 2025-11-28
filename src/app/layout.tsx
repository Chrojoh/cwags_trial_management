import type { Metadata } from "next"
// import { Inter } from "next/font/google"  // ← Commented out
import "./globals.css"

import ResetHandler from "./reset-handler"   // ← ✅ ADD THIS

// const inter = Inter({ subsets: ["latin"] })  // ← Commented out

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
      <body className="antialiased">
        <ResetHandler />    {/* ← ✅ ADD THIS */}
        {children}
      </body>
    </html>
  )
}
