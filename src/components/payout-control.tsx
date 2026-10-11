"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle, Warning } from "@phosphor-icons/react/dist/ssr";
import { recordPayout, undoPayouts } from "@/lib/actions/client";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { peso } from "@/lib/format";
import type { Payout } from "@/lib/supabase/types";

const day = (date: string) => format(new Date(`${date}T00:00`), "MMM d");

/** Marks a driver's salary for the viewed period as handed over, and keeps
 * the record of every payout. A payout is stored per day worked, so the day,
 * week and month views always agree on what is paid. */
export function PayoutControl({
  driverId,
  driverName,
  from,
  to,
  remaining,
  paidInPeriod,
  history,
}: {
  driverId: string;
  driverName: string;
  from: string;
  to: string;
  /** Earned minus paid for the period. Negative = paid more than earned. */
  remaining: number;
  paidInPeriod: Payout[];
  history: Payout[];
}) {
  const [pending, startTransition] = useTransition();
  const [asking, setAsking] = useState<"pay" | "undo" | null>(null);
  const paid = paidInPeriod.reduce((sum, p) => sum + Number(p.amount), 0);

  function confirm() {
    const kind = asking;
    setAsking(null);
    startTransition(async () => {
      try {
        if (kind === "pay") toast.success(`${peso(await recordPayout(driverId, from, to))} marked as paid`);
        else {
          await undoPayouts(driverId, from, to);
          toast.success("Payout undone");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save.");
      }
    });
  }

  // Day rows saved in one tap share a timestamp: shown as one payout.
  const groups = Object.values(
    history.reduce<Record<string, { at: string; from: string; to: string; amount: number }>>((all, p) => {
      const g = (all[p.paid_at] ??= { at: p.paid_at, from: p.period_from, to: p.period_to, amount: 0 });
      g.amount += Number(p.amount);
      if (p.period_from < g.from) g.from = p.period_from;
      if (p.period_to > g.to) g.to = p.period_to;
      return all;
    }, {})
  ).sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="border-t border-border">
      {paid > 0 && (
        <div className="flex items-center gap-2 py-1 pr-1.5 pl-4">
          <CheckCircle size={18} weight="fill" className="shrink-0 text-success-ink" />
          <p className="min-w-0 flex-1 text-[0.9375rem]">
            <span className="num font-semibold">{peso(paid)}</span>
            <span className="text-ink-muted"> already paid</span>
          </p>
          <Button variant="ghost" disabled={pending} onClick={() => setAsking("undo")}>
            Undo
          </Button>
        </div>
      )}

      {remaining > 0.004 && (
        <div className="px-4 py-3">
          <Button disabled={pending} onClick={() => setAsking("pay")} className="h-12 w-full">
            {pending ? "Saving..." : `Mark ${peso(remaining)} as paid`}
          </Button>
        </div>
      )}

      {remaining < -0.004 && (
        <p className="flex items-start gap-2 px-4 py-3 text-[0.9375rem] font-medium text-warning-ink">
          <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
          Paid {peso(-remaining)} more than earned. A sale or the pay rules changed after paying.
        </p>
      )}

      {groups.length > 0 && (
        <details className="border-t border-border">
          <summary className="flex min-h-12 cursor-pointer items-center px-4 font-medium text-deep-blue">
            Payout history
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {groups.map((g) => (
              <li key={g.at} className="flex justify-between gap-3 px-4 py-2.5 text-[0.9375rem]">
                <span className="text-ink-muted">
                  For {g.from === g.to ? day(g.from) : `${day(g.from)} - ${day(g.to)}`}, paid{" "}
                  {format(new Date(g.at), "MMM d")}
                </span>
                <span className="num shrink-0 font-medium">{peso(g.amount)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <ConfirmDialog
        open={asking !== null}
        title={asking === "undo" ? `Undo ${driverName}'s payout?` : `Pay ${driverName} ${peso(remaining)}?`}
        description={
          asking === "undo"
            ? `${peso(paid)} will go back to "still to pay" for ${from === to ? day(from) : `${day(from)} - ${day(to)}`}.`
            : `Salary for ${from === to ? day(from) : `${day(from)} - ${day(to)}`} will be recorded as handed over.`
        }
        confirmLabel={asking === "undo" ? "Undo payout" : "Yes, paid"}
        danger={asking === "undo"}
        onConfirm={confirm}
        onCancel={() => setAsking(null)}
      />
    </div>
  );
}
