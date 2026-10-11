"use client";

import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

/** Starts a phone call only after a yes, so a stray tap never dials. */
export function CallButton({
  name,
  phone,
  className,
  children,
}: {
  name: string;
  phone: string;
  className?: string;
  children: ReactNode;
}) {
  const [asking, setAsking] = useState(false);
  return (
    <>
      <button type="button" aria-label={`Call ${name}`} onClick={() => setAsking(true)} className={className}>
        {children}
      </button>
      <ConfirmDialog
        open={asking}
        title={`Call ${name}?`}
        description={phone}
        confirmLabel="Call"
        onConfirm={() => {
          setAsking(false);
          window.location.href = `tel:${phone}`;
        }}
        onCancel={() => setAsking(false)}
      />
    </>
  );
}
