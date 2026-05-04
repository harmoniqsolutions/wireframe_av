import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 px-3" : "h-9 px-4",
        variant === "primary" && "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700",
        variant === "secondary" && "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100",
        variant === "ghost" && "border-transparent bg-transparent text-neutral-700 hover:bg-neutral-100",
        variant === "danger" && "border-red-700 bg-red-700 text-white hover:bg-red-600",
        className
      )}
      {...props}
    />
  );
}
