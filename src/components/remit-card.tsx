"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash } from "@phosphor-icons/react/dist/ssr";
import { deleteExpense, undoPayout } from "@/lib/actions/client";
import type { Deduction } from "@/lib/actions/reports";
import type { DriverDelivery } from "@/lib/actions/transactions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ExpenseButton } from "@/components/expense-button";
import { peso } from "@/lib/format";
import type { Driver } from "@/lib/supabase/types";

/** The cash a driver hands over at the end of the day: what customers paid,
 * minus what the driver spent from it (expenses and bale). */
export function RemitCard({
  driver,
  drivers,
  date,
  today,
  deliveries,
  deductions,
  onChanged,
}: {
  driver: Driver;
  drivers: Driver[];
  date: string;
  today: string;
  deliveries: DriverDelivery[];
  deductions: Deduction[];
  /** Called after an expense or bale is added or removed. */
  onChanged: () => void;
}) {
  const [removing, setRemoving] = useState<Deduction | null>(null);
  const collected = deliveries.reduce((sum, d) => sum + (d.paid ? d.gallons * d.unit_price : 0), 0);
  const unpaid = deliveries.reduce((sum, d) => sum + (d.paid ? 0 : d.gallons * d.unit_price), 0);
  const spent = deductions.reduce((sum, d) => sum + d.amount, 0);
  const remit = collected - spent;

  async function remove() {
    const item = removing!;
    setRemoving(null);
    try {
      await (item.kind === "bale" ? undoPayout(item.id) : deleteExpense(item.id));
      toast("Removed");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove.");
    }
  }

  return (
    <section aria-labelledby="remit-title" className="card">
      <div className="flex items-end justify-between gap-3 px-4 pt-3 pb-2">
        <h2 id="remit-title" className="section-title">
          {driver.name} to remit
        </h2>
        <p className={`num text-[1.75rem] leading-tight font-semibold ${remit < 0 ? "text-danger-ink" : "text-deep-blue"}`}>
          {peso(Math.round(remit * 100) / 100)}
        </p>
      </div>
      <dl className="border-t border-border px-4 py-2 text-[0.9375rem]">
        <div className="flex justify-between gap-3 py-1">
          <dt className="text-ink-muted">Paid by customers</dt>
          <dd className="num font-medium">{peso(Math.round(collected * 100) / 100)}</dd>
        </div>
        {deductions.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-2">
            <dt className="min-w-0 flex-1 truncate text-ink-muted">{d.label}</dt>
            <dd className="num font-medium">- {peso(d.amount)}</dd>
            <button
              type="button"
              aria-label={`Remove ${d.label} ${peso(d.amount)}`}
              onClick={() => setRemoving(d)}
              className="press -mr-2.5 grid h-11 w-9 shrink-0 place-items-center rounded-pill text-ink-muted"
            >
              <Trash size={16} />
            </button>
          </div>
        ))}
        {unpaid > 0 && (
          <p className="py-1 text-sm text-ink-muted">
            {peso(Math.round(unpaid * 100) / 100)} still unpaid is not counted until it is marked paid.
          </p>
        )}
      </dl>
      <div className="border-t border-border px-2">
        <ExpenseButton
          today={today}
          date={date}
          drivers={drivers}
          payer={driver.id}
          onSaved={onChanged}
          className="press flex h-12 items-center gap-1.5 px-2 font-display text-[0.9375rem] font-semibold text-deep-blue"
        >
          <Plus size={16} weight="bold" />
          Expense or bale
        </ExpenseButton>
      </div>

      <ConfirmDialog
        open={!!removing}
        title={`Remove ${removing?.label ?? ""}?`}
        description={removing ? `${peso(removing.amount)} goes back into what ${driver.name} remits.` : ""}
        confirmLabel="Remove"
        danger
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </section>
  );
}
