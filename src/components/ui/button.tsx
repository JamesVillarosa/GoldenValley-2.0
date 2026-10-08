import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ className, variant = "primary", type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "press inline-flex items-center justify-center gap-2 rounded-pill px-6 font-display font-semibold disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" && "h-14 bg-deep-blue text-white",
        variant === "danger" && "h-12 bg-danger-ink text-white",
        variant === "secondary" && "h-12 border border-border bg-surface text-deep-blue",
        variant === "ghost" && "h-11 px-3 text-ink-muted",
        className
      )}
      {...props}
    />
  );
});
