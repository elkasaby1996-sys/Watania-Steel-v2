import React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium backdrop-blur-xl transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground hover:bg-primary",
        secondary:
          "border-white/[0.12] bg-[var(--glass-panel-soft)] text-secondary-foreground hover:bg-[var(--glass-panel)]",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive",
        outline: "border-white/[0.16] bg-white/[0.03] text-foreground",
        success:
          "border-success bg-success text-success-foreground",
        warning:
          "border-warning bg-warning text-warning-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
