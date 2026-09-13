import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-[11px] font-semibold leading-none tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-[#10B981]/20 bg-[#ECFDF5] text-[#065F46]",
        secondary: "border-border bg-[#F1F5F9] text-[#475569]",
        success: "border-[#10B981]/20 bg-[#ECFDF5] text-[#065F46]",
        warning: "border-[#F59E0B]/20 bg-[#FFFBEB] text-[#92400E]",
        destructive: "border-[#EF4444]/20 bg-[#FEF2F2] text-[#991B1B]",
        outline: "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };