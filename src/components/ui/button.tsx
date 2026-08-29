import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ className, variant = "primary", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] px-6 font-display font-semibold transition-[transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" &&
          "h-14 bg-[var(--color-deep-blue)] text-white",
        variant === "secondary" &&
          "h-12 border border-[var(--color-border)] bg-transparent text-[var(--color-deep-blue)]",
        variant === "ghost" &&
          "h-10 bg-transparent px-3 text-[var(--color-ink-muted)]",
        className
      )}
      {...props}
    />
  );
});
