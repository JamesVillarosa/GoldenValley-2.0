"use client";

import { useState } from "react";
import { Drop } from "@phosphor-icons/react/dist/ssr";
import { unlock } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({ firstRun }: { firstRun: boolean }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      // Only returns on failure; success redirects.
      setError(await unlock(pin));
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-xs flex-1 flex-col justify-center px-4 pb-16">
      <span className="grid h-14 w-14 place-items-center rounded-lg bg-deep-blue text-white">
        <Drop size={30} weight="fill" />
      </span>
      <h1 className="mt-5 font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">
        Golden Valley
      </h1>
      <p className="mt-1 text-[0.9375rem] text-ink-muted">
        {firstRun
          ? "Create a PIN. It keeps customer and salary records private."
          : "Enter your PIN to open the station log."}
      </p>

      <label htmlFor="pin" className="field-label mt-8">
        {firstRun ? "New PIN (4 to 8 digits)" : "PIN"}
      </label>
      <Input
        id="pin"
        autoFocus
        type={firstRun ? "text" : "password"}
        inputMode="numeric"
        autoComplete={firstRun ? "new-password" : "current-password"}
        maxLength={8}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        aria-invalid={!!error}
        aria-describedby="pin-error"
        className="num text-center text-2xl tracking-[0.3em]"
      />
      <p id="pin-error" role="alert" className="mt-2 min-h-5 text-sm font-medium text-danger-ink">
        {error}
      </p>

      <Button type="submit" disabled={busy || pin.length < 4} className="mt-3 w-full">
        {busy ? "Checking..." : firstRun ? "Create PIN" : "Unlock"}
      </Button>
    </form>
  );
}
