"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { deletePayout, recordPayout } from "@/lib/actions/reports";
import { Button } from "@/components/ui/button";
import { peso } from "@/lib/format";
import type { Payout } from "@/lib/supabase/types";

const periodLabel = (p: Payout) =>
  p.period_from === p.period_to
    ? format(new Date(`${p.period_from}T00:00`), "MMM d")
    : `${format(new Date(`${p.period_from}T00:00`), "MMM d")} - ${format(new Date(`${p.period_to}T00:00`), "MMM d")}`;

/** Marks a driver's salary for the viewed period as handed over, and keeps
 * the record of every payout. */
export function PayoutControl({
  driverId,
  from,
  to,
  remaining,
  paidInPeriod,
  history,
}: {
  driverId: string;
  from: string;
  to: string;
  remaining: number;
  paidInPeriod: Payout[];
  history: Payout[];
}) {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<void>, done: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(done);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save.");
      }
    });
  }

  return (
    <div className="border-t border-border">
      {paidInPeriod.length > 0 && (
        <ul className="divide-y divide-border">
          {paidInPeriod.map((p) => (
            <li key={p.id} className="flex items-center gap-2 py-1 pr-1.5 pl-4">
              <CheckCircle size={18} weight="fill" className="shrink-0 text-success-ink" />
              <p className="min-w-0 flex-1 text-[0.9375rem]">
                <span className="num font-semibold">{peso(p.amount)}</span>
                <span className="text-ink-muted"> paid {format(new Date(p.paid_at), "MMM d, h:mm a")}</span>
              </p>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => deletePayout(p.id), "Payout undone")}
              >
                Undo
              </Button>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <div className="px-4 py-3">
          <Button
            disabled={pending}
            onClick={() => run(() => recordPayout(driverId, from, to, remaining), "Marked as paid")}
            className="h-12 w-full"
          >
            Mark {peso(remaining)} as paid
          </Button>
        </div>
      )}

      {history.length > 0 && (
        <details className="border-t border-border">
          <summary className="flex min-h-12 cursor-pointer items-center px-4 font-medium text-deep-blue">
            Payout history
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {history.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 px-4 py-2.5 text-[0.9375rem]">
                <span className="text-ink-muted">
                  For {periodLabel(p)}, paid {format(new Date(p.paid_at), "MMM d")}
                </span>
                <span className="num shrink-0 font-medium">{peso(p.amount)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
