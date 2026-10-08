import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-[52px] w-full rounded-md border border-border bg-surface px-4 text-[1.0625rem] text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-ink-muted",
          "focus:border-aqua focus:ring-[3px] focus:ring-aqua/25",
          className
        )}
        {...props}
      />
    );
  }
);
