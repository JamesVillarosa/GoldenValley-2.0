"use client";

import { format } from "date-fns";
import { Trash, Drop } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { deleteTransaction } from "@/lib/actions/transactions";
import type { DriverDelivery } from "@/lib/actions/transactions";

export function TodayDeliveries({
  deliveries,
  onDeleted,
}: {
  deliveries: DriverDelivery[];
  onDeleted: (id: string) => void;
}) {
  async function handleDelete(tx: DriverDelivery) {
    onDeleted(tx.id);
    try {
      await deleteTransaction(tx.id, tx.customer_id);
      toast("Transaction removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove.");
    }
  }

  const totalGallons = deliveries.reduce((sum, d) => sum + Number(d.gallons), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="font-display text-lg font-semibold text-[var(--color-ink)]">
          Today&apos;s deliveries
        </h2>
        {deliveries.length > 0 && (
          <span className="text-sm font-medium text-[var(--color-ink-muted)]">
            {totalGallons.toLocaleString()} gal · {deliveries.length}{" "}
            {deliveries.length === 1 ? "stop" : "stops"}
          </span>
        )}
      </div>

      {deliveries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] px-6 py-14 text-center">
          <Drop size={28} weight="light" color="var(--color-ink-muted)" />
          <p className="text-sm text-[var(--color-ink-muted)]">
            No deliveries logged today.
            <br />
            Log one above to get started.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          {deliveries.map((tx) => (
            <li key={tx.id} className="flex items-center gap-3 px-4 py-3.5">
              <div
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-sm font-semibold text-[var(--color-deep-blue)]"
                style={{ backgroundColor: "var(--color-mist)" }}
              >
                {tx.customerName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-medium text-[var(--color-ink)]">
                  {tx.customerName}
                </p>
                <p className="text-sm text-[var(--color-ink-muted)]">
                  {format(new Date(tx.created_at), "h:mm a")}
                </p>
              </div>
              <span className="font-display font-semibold tabular-nums text-[var(--color-ink)]">
                {tx.gallons} gal
              </span>
              <button
                type="button"
                aria-label="Delete transaction"
                onClick={() => handleDelete(tx)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-pill)] text-[var(--color-ink-muted)] transition-transform duration-150 active:scale-[0.9]"
              >
                <Trash size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
