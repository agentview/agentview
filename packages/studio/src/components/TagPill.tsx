import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/lib/utils"

const tagPillVariants = cva(
  "inline-flex flex-row gap-1 items-center bg-gray-100 text-gray-700 [&>svg]:shrink-0 font-normal",
  {
    variants: {
      size: {
        xs: "h-[20px] rounded-xs px-1 text-[13px] [&>*]:size-3.5",
        sm: "h-[24px] rounded-sm px-1.5 text-sm [&>*]:size-3.5",
        md: "h-[28px] rounded-sm px-2 text-sm [&>*]:size-4",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

function TagPill({
  className,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof tagPillVariants>) {
  return (
    <div
      className={cn(tagPillVariants({ size, className }))}
      {...props}
    />
  )
}

export { TagPill, tagPillVariants }