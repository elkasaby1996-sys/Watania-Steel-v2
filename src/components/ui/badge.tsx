import React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium backdrop-blur-xl transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border-primary/35 bg-primary/85 text-primary-foreground hover:bg-primary",
        secondary:
          "border-white/12 bg-secondary/70 text-secondary-foreground hover:bg-secondary/90",
        destructive:
          "border-destructive/35 bg-destructive/85 text-destructive-foreground hover:bg-destructive",
        outline: "border-white/16 bg-white/[0.03] text-foreground",
        success:
          "border-success/35 bg-success/85 text-success-foreground",
        warning:
          "border-warning/40 bg-warning/90 text-warning-foreground",
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
