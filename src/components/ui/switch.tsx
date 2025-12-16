"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

interface SwitchProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className = "", checked, onCheckedChange, ...props }, ref) => {
    return (
      <SwitchPrimitives.Root
        ref={ref}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked 
            ? 'bg-green-600 border-green-600' 
            : 'bg-gray-300 border-gray-400'
        } ${className}`}
        {...props}
      >
        <SwitchPrimitives.Thumb
          className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
        />
      </SwitchPrimitives.Root>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };