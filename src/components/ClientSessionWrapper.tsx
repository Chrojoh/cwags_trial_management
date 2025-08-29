"use client"

import { ReactNode } from "react"

interface ClientSessionWrapperProps {
  children: ReactNode
}

export default function ClientSessionWrapper({ children }: ClientSessionWrapperProps) {
  return <>{children}</>
}