import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-[52px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[1.0625rem] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted)] transition-[border-color,box-shadow] duration-150",
        "focus:border-[var(--color-aqua)] focus:ring-[3px] focus:ring-[var(--color-aqua)]/25",
        className
      )}
      {...props}
    />
  );
});
