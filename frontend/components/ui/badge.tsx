import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "solar" | "nasa";
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "border-transparent bg-primary/15 text-primary border-primary/20 hover:bg-primary/25",
  secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive: "border-transparent bg-destructive/15 text-destructive border-destructive/20 hover:bg-destructive/25",
  outline: "border-border text-foreground hover:bg-accent/10",
  success: "border-emerald-500/25 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25",
  warning: "border-amber-500/25 bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25",
  solar: "border-orange-500/30 bg-gradient-to-r from-orange-500/15 to-amber-500/15 text-orange-600 dark:text-orange-400",
  nasa: "border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-400",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantStyles[variant] || variantStyles.default,
        className
      )}
      {...props}
    />
  );
}
