"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { PencilSimple, Trash } from "@phosphor-icons/react/dist/ssr";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { GallonStepper } from "@/components/gallon-stepper";
import { deleteTransaction, setGallons, setPaid, type DriverDelivery } from "@/lib/actions/transactions";
import { gal, peso } from "@/lib/format";
import { cn } from "@/lib/utils";

type Rows = DriverDelivery[] | null;
type Ask = { kind: "paid" | "gallons" | "delete"; tx: DriverDelivery };

/** A day's sales. Each row can have its gallons corrected, be marked paid or
 * unpaid, or be removed; every change asks first and shows at once. */
export function DeliveryList({
  rows,
  setRows,
  showDriver = false,
}: {
  rows: DriverDelivery[];
  setRows: Dispatch<SetStateAction<Rows>>;
  showDriver?: boolean;
}) {
  const [ask, setAsk] = useState<Ask | null>(null);
  const [gallons, setGallonsDraft] = useState(1);
  const tx = ask?.tx;

  // Show the change first, put the old rows back if the server refuses it.
  async function apply(next: (rows: DriverDelivery[]) => DriverDelivery[], save: () => Promise<void>, done: string) {
    setAsk(null);
    const before = rows;
    setRows(next(rows));
    try {
      await save();
      toast(done);
    } catch (error) {
      setRows(before);
      toast.error(error instanceof Error ? error.message : "Could not save. Check your signal.");
    }
  }

  function confirm() {
    if (!ask) return;
    const { kind, tx } = ask;
    const patch = (change: Partial<DriverDelivery>) => (list: DriverDelivery[]) =>
      list.map((row) => (row.id === tx.id ? { ...row, ...change } : row));

    if (kind === "paid") {
      apply(patch({ paid: !tx.paid }), () => setPaid(tx.id, !tx.paid), tx.paid ? "Marked unpaid" : "Marked paid");
    } else if (kind === "gallons") {
      apply(patch({ gallons }), () => setGallons(tx.id, gallons), `Changed to ${gal(gallons)}`);
    } else {
      apply((list) => list.filter((row) => row.id !== tx.id), () => deleteTransaction(tx.id), "Removed");
    }
  }

  const amount = tx ? peso(tx.gallons * tx.unit_price) : "";
  const dialog = !ask || !tx
    ? { title: "", description: "", confirmLabel: "" }
    : ask.kind === "paid"
      ? tx.paid
        ? { title: "Mark as unpaid?", description: `${tx.customerName} will owe ${amount} again.`, confirmLabel: "Yes, unpaid" }
        : { title: "Mark as paid?", description: `${tx.customerName} paid ${amount}.`, confirmLabel: "Yes, paid" }
      : ask.kind === "gallons"
        ? { title: "Change gallons", description: tx.customerName, confirmLabel: "Save" }
        : { title: "Remove this sale?", description: `${gal(tx.gallons)} for ${tx.customerName} will be deleted from the log.`, confirmLabel: "Remove" };

  return (
    <>
      <ul className="card divide-y divide-border">
        {rows.map((row) => (
          <li key={row.id} className="row-in flex items-center gap-1 py-2 pr-1.5 pl-4">
            <button
              type="button"
              aria-label={`${row.customerName}, ${gal(row.gallons)}. Tap to change gallons`}
              onClick={() => {
                setGallonsDraft(Number(row.gallons));
                setAsk({ kind: "gallons", tx: row });
              }}
              className="min-w-0 flex-1 py-1 text-left"
            >
              <span className="block truncate font-medium">{row.customerName}</span>
              <span className="num flex items-center gap-1.5 text-sm whitespace-nowrap text-ink-muted">
                <span className="shrink-0 text-[1.0625rem] font-semibold text-ink">{gal(row.gallons)}</span>
                <PencilSimple size={14} aria-hidden className="shrink-0" />
                {row.unit_price > 0 && <span className="shrink-0">· {peso(row.gallons * row.unit_price)}</span>}
                {showDriver && row.driverName && <span className="min-w-0 truncate font-body">· {row.driverName}</span>}
              </span>
            </button>
            {row.unit_price > 0 && (
              <button
                type="button"
                aria-pressed={row.paid}
                aria-label={`${row.customerName}: ${row.paid ? "paid" : "unpaid"}. Tap to change`}
                onClick={() => setAsk({ kind: "paid", tx: row })}
                className={cn(
                  "press h-10 w-[4.75rem] shrink-0 rounded-pill border text-sm font-semibold",
                  row.paid ? "border-success-ink/30 bg-success/10 text-success-ink" : "border-danger-ink/30 bg-danger/10 text-danger-ink"
                )}
              >
                {row.paid ? "Paid" : "Unpaid"}
              </button>
            )}
            <button
              type="button"
              aria-label={`Remove ${row.customerName}`}
              onClick={() => setAsk({ kind: "delete", tx: row })}
              className="press grid h-11 w-11 shrink-0 place-items-center rounded-pill text-ink-muted"
            >
              <Trash size={18} />
            </button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!ask}
        {...dialog}
        danger={ask?.kind === "delete"}
        onConfirm={confirm}
        onCancel={() => setAsk(null)}
      >
        {ask?.kind === "gallons" && (
          <div className="mt-4 flex justify-center">
            <GallonStepper value={gallons} onChange={setGallonsDraft} />
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}

/** The day's headline: gallons first, money still to collect second. */
export function DayTotal({ rows }: { rows: DriverDelivery[] }) {
  const total = rows.reduce((sum, row) => sum + Number(row.gallons), 0);
  const owed = rows.reduce((sum, row) => sum + (row.paid ? 0 : row.gallons * row.unit_price), 0);
  return (
    <p className="num text-right leading-tight">
      <span className="text-[1.75rem] font-semibold text-deep-blue">{gal(total)}</span>
      {owed > 0 && <span className="block text-sm font-medium text-danger-ink">{peso(owed)} unpaid</span>}
    </p>
  );
}
