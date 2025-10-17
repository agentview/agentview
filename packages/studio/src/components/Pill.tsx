import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/lib/utils"

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

  // let bgColor = "bg-gray-200";
  
  // if (color) {
  //   if (colorsMap[color as Color]) {
  //     bgColor = colorsMap[color as Color]
  //   } else {
  //     bgColor = `bg-[${color}]`;
  //   }
  // }

  const bgColor = "bg-[var(--color-red-400)]"
  
  return (
    <div
      className={cn(bgColor, pillVariants({ size, className }))}
      {...props}
    />
  )
}

// const pillButtonVariants = cva(
//   "inline-flex items-center justify-start gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
//   {
//     variants: {
//       size: {
//         default: "h-8 rounded-md px-1.5",
//         // sm: "h-8 rounded-md px-1.5",
//       },
//     },
//     defaultVariants: {
//       size: "default",
//     },
//   }
// )

// function PillButton({
//   className,
//   size,
//   ...props
// }: React.ComponentProps<"button"> & VariantProps<typeof pillButtonVariants>) {
//   return (
//     <button
//       className={cn(pillButtonVariants({ size, className }))}
//       {...props}
//     />
//   )
// }

export { Pill, pillVariants }