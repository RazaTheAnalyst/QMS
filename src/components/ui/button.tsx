import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none h-10 px-5",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-[#42a5f5] to-[#1976d2] text-white hover:brightness-110 active:scale-[0.98] shadow-[0_12px_26px_-12px_rgba(25,118,210,0.8)]",
        secondary: "bg-slate-300 text-slate-800 hover:bg-slate-400/70 active:scale-[0.98] shadow-[0_8px_18px_-12px_rgba(71,85,105,0.7)] dark:bg-white/15 dark:text-white dark:hover:bg-white/25",
        outline: "border border-[#e6ebf2] bg-white hover:border-[#1976d2] hover:text-[#1976d2] hover:shadow-[0_8px_20px_-12px_rgba(25,118,210,0.5)] active:scale-[0.98] dark:bg-transparent dark:border-white/15",
        ghost: "hover:bg-slate-100 dark:hover:bg-white/10",
        destructive: "bg-gradient-to-b from-[#d9533f] to-[#c2412d] text-white hover:brightness-110 active:scale-[0.98] shadow-[0_12px_26px_-14px_rgba(194,65,45,0.8)]",
        success: "bg-gradient-to-b from-[#1fa06d] to-[#168256] text-white hover:brightness-110 active:scale-[0.98] shadow-[0_12px_26px_-14px_rgba(22,130,86,0.8)]",
        warning: "bg-gradient-to-b from-[#e3ab3d] to-[#d89b28] text-[#1f1605] hover:brightness-105 active:scale-[0.98]",
        violet: "bg-gradient-to-b from-[#8b5cf6] to-[#7c3aed] text-white hover:brightness-110 active:scale-[0.98] shadow-[0_12px_26px_-14px_rgba(124,58,237,0.8)]",
        dangerOutline: "border border-red-300 bg-red-50 text-[#c2412d] hover:bg-red-100 active:scale-[0.98] dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-3.5 text-[13px]",
        lg: "h-12 px-7",
        icon: "h-9 w-9 px-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
