import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-[#e6ebf2] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05),0_4px_14px_-10px_rgba(16,24,40,0.18)] dark:border-white/10 dark:bg-[#171d1b]",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-3 border-b border-[#e6ebf2] bg-[#f8fafc] px-5 py-3.5 rounded-t-[14px] dark:bg-white/5 dark:border-white/10", className)} {...props} />;
}
