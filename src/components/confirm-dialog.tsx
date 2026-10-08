"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const id = setTimeout(() => setMounted(false), 150);
    return () => clearTimeout(id);
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 flex items-end justify-center px-4 pb-8 transition-opacity duration-150 sm:items-center"
      style={{
        zIndex: "var(--z-modal)",
        backgroundColor: "oklch(from #0a2540 l c h / 0.4)",
        opacity: visible ? 1 : 0,
      }}
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-5 shadow-lg transition-[opacity,transform] duration-150 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.96)",
        }}
      >
        <h2
          id="confirm-dialog-title"
          className="font-display text-lg font-semibold text-[var(--color-ink)]"
        >
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
          {description}
        </p>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1"
            style={
              destructive
                ? { backgroundColor: "var(--color-danger)" }
                : undefined
            }
          >
            {loading ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
