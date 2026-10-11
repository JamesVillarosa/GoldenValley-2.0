"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle, Warning } from "@phosphor-icons/react/dist/ssr";
import { recordPayout, undoPayout } from "@/lib/actions/client";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { peso } from "@/lib/format";
import type { Payout } from "@/lib/supabase/types";

const day = (date: string) => format(new Date(`${date}T00:00`), "MMM d");

/** What a driver is still owed and the record of everything handed over.
 * The amount is everything earned up to `asOf` minus everything ever paid
 * (salary and bale), so it reads the same from the day, week or month view. */
export function PayoutControl({
  driverId,
  driverName,
  asOf,
  current,
  owed,
  history,
}: {
  /** The view reaches today. Looking back at an old day, later payouts make
   * "paid ahead" meaningless, so it is only reported for the present. */
  current: boolean;
  driverId: string;
  driverName: string;
  /** Last day counted: the end of the viewed period, never later than today. */
  asOf: string;
  /** Negative = paid ahead (a bale not yet earned back, or a sale changed after paying). */
  owed: number;
  history: Payout[];
}) {
  const [pending, startTransition] = useTransition();
  const [paying, setPaying] = useState(false);
  const [undoing, setUndoing] = useState<Payout | null>(null);

  function run(action: () => Promise<string>) {
    setPaying(false);
    setUndoing(null);
    startTransition(async () => {
      try {
        toast.success(await action());
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save.");
      }
    });
  }

  return (
    <div className="border-t border-border">
      {owed > 0.004 ? (
        <div className="px-4 py-3">
          <p className="pb-2 text-sm text-ink-muted">Everything not yet paid, up to {day(asOf)}</p>
          <Button disabled={pending} onClick={() => setPaying(true)} className="h-12 w-full">
            {pending ? "Saving..." : `Mark ${peso(owed)} as paid`}
          </Button>
        </div>
      ) : owed < -0.004 && current ? (
        <p className="flex items-start gap-2 px-4 py-3 text-[0.9375rem] font-medium text-warning-ink">
          <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
          Paid ahead by {peso(-owed)} (bale, or a sale changed after paying). It comes off the next pay.
        </p>
      ) : (
        history.length > 0 && (
          <p className="flex items-center gap-2 px-4 py-3 text-[0.9375rem] font-medium text-success-ink">
            <CheckCircle size={18} weight="fill" className="shrink-0" />
            All paid up to {day(asOf)}
          </p>
        )
      )}

      {history.length > 0 && (
        <details className="border-t border-border">
          <summary className="flex min-h-12 cursor-pointer items-center px-4 font-medium text-deep-blue">
            Payouts and bale
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {history.map((p) => (
              <li key={p.id} className="flex items-center gap-2 py-1 pr-1.5 pl-4 text-[0.9375rem]">
                <span className="min-w-0 flex-1 text-ink-muted">
                  {p.kind === "advance" ? `Bale, ${day(p.period_to)}` : `Salary up to ${day(p.period_to)}`}
                </span>
                <span className="num shrink-0 font-medium">{peso(p.amount)}</span>
                <Button variant="ghost" disabled={pending} onClick={() => setUndoing(p)}>
                  Undo
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <ConfirmDialog
        open={paying}
        title={`Pay ${driverName} ${peso(owed)}?`}
        description={`Everything not yet paid up to ${day(asOf)} will be recorded as handed over.`}
        confirmLabel="Yes, paid"
        onConfirm={() => run(async () => `${peso(await recordPayout(driverId, asOf))} marked as paid`)}
        onCancel={() => setPaying(false)}
      />
      <ConfirmDialog
        open={!!undoing}
        title={undoing?.kind === "advance" ? "Remove this bale?" : "Undo this payout?"}
        description={undoing ? `${peso(undoing.amount)} goes back to what ${driverName} is still owed.` : ""}
        confirmLabel={undoing?.kind === "advance" ? "Remove" : "Undo payout"}
        danger
        onConfirm={() => {
          const id = undoing!.id;
          run(async () => {
            await undoPayout(id);
            return "Removed";
          });
        }}
        onCancel={() => setUndoing(null)}
      />
    </div>
  );
}
