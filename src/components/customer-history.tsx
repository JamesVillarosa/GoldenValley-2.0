"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Trash } from "@phosphor-icons/react/dist/ssr";
import { deleteTransaction, setPaid, settleCustomer } from "@/lib/actions/transactions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { gal, peso } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/supabase/types";

/** Balance plus delivery history. Rows come from the server and refresh after
 * every action, so the balance and the list can never disagree. */
export function CustomerHistory({
  customerId,
  transactions,
  balanceLabel,
  owes,
}: {
  customerId: string;
  transactions: Transaction[];
  balanceLabel: string;
  owes: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [toDelete, setToDelete] = useState<Transaction | null>(null);

  function run(action: () => Promise<void>, done: string) {
    startTransition(async () => {
      try {
        await action();
        toast(done);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save.");
      }
    });
  }

  return (
    <>
      {owes && (
        <div className="card flex items-center justify-between gap-3 py-3 pr-3 pl-4">
          <div>
            <p className="text-sm text-ink-muted">Unpaid balance</p>
            <p className="num text-xl font-semibold text-danger-ink">{balanceLabel}</p>
          </div>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => settleCustomer(customerId), "Balance cleared")}
          >
            Mark all paid
          </Button>
        </div>
      )}

      <section aria-labelledby="history-title">
        <h2 id="history-title" className="section-title pb-2">
          Deliveries
        </h2>
        {transactions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-6 py-8 text-center text-[0.9375rem] text-ink-muted">
            No deliveries yet. Tap Deliver to log the first one.
          </p>
        ) : (
          <ul className={cn("card divide-y divide-border", pending && "opacity-60")}>
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center gap-2 py-2 pr-1.5 pl-4">
                <div className="min-w-0 flex-1">
                  <p className="num font-semibold">
                    {gal(tx.gallons)}
                    {tx.unit_price > 0 && (
                      <span className="font-body font-normal text-ink-muted"> · {peso(tx.gallons * tx.unit_price)}</span>
                    )}
                  </p>
                  <p className="text-sm text-ink-muted">{format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}</p>
                </div>
                {tx.unit_price > 0 && (
                  <button
                    type="button"
                    disabled={pending}
                    aria-pressed={tx.paid}
                    onClick={() => run(() => setPaid(tx.id, !tx.paid), tx.paid ? "Marked unpaid" : "Marked paid")}
                    className={cn(
                      "press h-9 shrink-0 rounded-pill border px-3 text-sm font-medium",
                      tx.paid ? "border-border text-success-ink" : "border-danger-ink/30 bg-danger/10 text-danger-ink"
                    )}
                  >
                    {tx.paid ? "Paid" : "Unpaid"}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Delete delivery"
                  onClick={() => setToDelete(tx)}
                  className="press grid h-11 w-11 shrink-0 place-items-center rounded-pill text-ink-muted"
                >
                  <Trash size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this delivery?"
        description={
          toDelete
            ? `${gal(toDelete.gallons)} on ${format(new Date(toDelete.created_at), "MMM d")} will be removed from history, salary and the dashboard.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={() => {
          const tx = toDelete!;
          setToDelete(null);
          run(() => deleteTransaction(tx.id), "Delivery deleted");
        }}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
