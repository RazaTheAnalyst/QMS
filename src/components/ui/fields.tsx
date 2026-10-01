import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-full border border-[#e6ebf2] bg-[#f6f9fd] px-4 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(16,24,40,0.05)] transition-shadow placeholder:text-slate-400 focus:border-[#1976d2] focus:outline-none focus:ring-4 focus:ring-[#1976d2]/20 focus:shadow-[0_0_0_4px_rgba(25,118,210,0.12)] dark:bg-white/5 dark:text-white dark:border-white/15",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-9 w-full rounded-full border border-[#e6ebf2] bg-[#f6f9fd] px-4 text-sm font-semibold text-slate-700 shadow-[inset_0_1px_2px_rgba(16,24,40,0.05)] focus:border-[#1976d2] focus:outline-none focus:ring-4 focus:ring-[#1976d2]/20 dark:bg-white/5 dark:text-white dark:border-white/15",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400", className)} {...props} />;
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-[26px] items-center rounded-full px-3 text-xs font-bold",
        className
      )}
      {...props}
    />
  );
}
