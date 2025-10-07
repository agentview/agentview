import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

const linkVariants = cva(
  "inline-flex items-center gap-1.5 transition-all outline-none focus-visible:ring-ring/50 focus-visible:ring-2 rounded-sm [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "text-cyan-700 dark:text-cyan-400 hover:underline underline-offset-4",
        muted:
          "text-muted-foreground hover:text-foreground hover:underline underline-offset-4",
        destructive:
          "text-destructive hover:underline underline-offset-4",
        primary:
          "text-primary hover:underline underline-offset-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkVariants> {
  icon?: React.ReactNode
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, variant, icon, children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn(linkVariants({ variant, className }))}
        {...props}
      >
        {icon && <span className="inline-flex shrink-0">{icon}</span>}
        {children}
      </a>
    )
  }
)

Link.displayName = "Link"

export { Link, linkVariants }

