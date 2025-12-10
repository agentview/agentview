import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const pillVariants = cva(
  "inline-flex flex-row gap-1 items-center text-black/90 [&>svg]:shrink-0 font-normal",
  {
    variants: {
      size: {
        xs: "h-[20px] rounded-xs px-1 text-[0.8125rem] [&>svg]:size-3.5", // 13px between xs and md, exception
        sm: "h-[22px] rounded-sm px-1.5 text-sm [&>svg]:size-4",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  }
)

function Pill({
  className,
  size,
  color,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof pillVariants>) {

  return (
    <div
      className={cn(pillVariants({ size, className }))}
      style={{ backgroundColor: color ?? "var(--color-gray-200)" }}
      {...props}
    />
  )
}

export { Pill, pillVariants }