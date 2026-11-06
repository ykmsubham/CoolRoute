import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "solar"
    | "emerald"
    | "glass";
  size?: "default" | "sm" | "lg" | "icon";
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md",
  outline:
    "border border-border bg-card/60 backdrop-blur-md hover:bg-accent/15 hover:border-primary/40 text-foreground",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost:
    "hover:bg-accent/15 hover:text-accent-foreground",
  link:
    "text-primary underline-offset-4 hover:underline",
  solar:
    "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:from-amber-600 hover:to-orange-600 hover:shadow-orange-500/25",
  emerald:
    "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:from-emerald-700 hover:to-teal-700 hover:shadow-emerald-500/25",
  glass:
    "bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/15 dark:border-white/10 text-foreground hover:bg-white/20 dark:hover:bg-white/10 shadow-xs",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-lg px-3 text-xs",
  lg: "h-11 rounded-xl px-7 text-base font-semibold",
  icon: "h-10 w-10 p-0",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer",
          variantStyles[variant] || variantStyles.default,
          sizeStyles[size] || sizeStyles.default,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
