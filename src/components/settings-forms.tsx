"use client";

import { useState } from "react";
import { toast } from "sonner";
import { lock } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePin } from "@/lib/actions/client";

export function SettingsForms() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    try {
      await action();
      toast.success(done);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  const digits = (value: string) => value.replace(/\D/g, "");

  return (
    <>
      <form
        className="card flex flex-col gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await changePin(current, next);
            setCurrent("");
            setNext("");
          }, "PIN changed");
        }}
      >
        <h2 className="section-title">PIN</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="pin-current" className="field-label">
              Current PIN
            </label>
            <Input
              id="pin-current"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={8}
              value={current}
              onChange={(e) => setCurrent(digits(e.target.value))}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="pin-next" className="field-label">
              New PIN (4 to 8 digits)
            </label>
            <Input
              id="pin-next"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={8}
              value={next}
              onChange={(e) => setNext(digits(e.target.value))}
            />
          </div>
        </div>
        <Button type="submit" variant="secondary" disabled={busy || current.length < 4 || next.length < 4}>
          Change PIN
        </Button>
      </form>

      <Button variant="ghost" onClick={() => lock()} className="self-center text-danger-ink">
        Lock app on this phone
      </Button>
    </>
  );
}
