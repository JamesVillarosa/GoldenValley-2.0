"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Native <dialog>: focus trap, Escape and backdrop come from the platform. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  loading = false,
  danger = false,
  children,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  /** Red confirm button, for actions that delete something. */
  danger?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      onClick={(e) => e.target === ref.current && onCancel()}
      className="dialog-in m-auto w-[calc(100%-2rem)] max-w-sm rounded-lg bg-surface p-5 text-ink backdrop:bg-ink/40"
    >
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-1.5 text-[0.9375rem] text-ink-muted">{description}</p>
      {children}
      <div className="mt-5 flex gap-3">
        <Button variant="secondary" onClick={onCancel} className="flex-1 px-3">
          Cancel
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={loading} className="h-12 flex-1 px-3">
          {loading ? "Working..." : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
