"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // Base styles
        "peer shrink-0 rounded border-2 shadow-sm transition-all outline-none",
        // Size - larger for better visibility
        "size-5",
        // Border and background
        "border-gray-500 bg-white",
        // Hover state - darker border and shadow
        "hover:border-gray-700 hover:shadow-md",
        // Focus state - orange ring
        "focus-visible:ring-4 focus-visible:ring-orange-500/20 focus-visible:border-orange-600",
        // Checked state - orange background and border
        "data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600 data-[state=checked]:shadow-lg",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Cursor
        "cursor-pointer",
        // Invalid state
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }