"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { PencilSimple, Trash } from "@phosphor-icons/react/dist/ssr";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/segmented";
import { GallonStepper } from "@/components/gallon-stepper";
import { type DriverDelivery } from "@/lib/actions/transactions";
import { gal, peso } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteTransaction, setGallons, setPaid } from "@/lib/actions/client";

type Rows = DriverDelivery[] | null;
type Ask = { kind: "paid" | "gallons" | "delete"; tx: DriverDelivery };

/** A day's sales. Each row can have its gallons corrected, be marked paid or
 * unpaid, or be removed. Marking paid is one tap; anything that takes money
 * off the books (unpaid, remove) asks first. */
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
  const [show, setShow] = useState<"all" | "paid" | "unpaid">("all");
  const paidCount = rows.filter((row) => row.paid).length;
  const shown = show === "all" ? rows : rows.filter((row) => row.paid === (show === "paid"));
  const [gallons, setGallonsDraft] = useState(1);
  const tx = ask?.tx;

  // Show the change first, put the old rows back if the server refuses it.
  async function apply(
    next: (rows: DriverDelivery[]) => DriverDelivery[],
    save: () => Promise<void>,
    done: string | { text: string; action: { label: string; onClick: () => void } }
  ) {
    setAsk(null);
    const before = rows;
    setRows(next(rows));
    try {
      await save();
      if (typeof done === "string") toast(done);
      else
        toast(done.text, {
          action: done.action,
          duration: 6000,
          actionButtonStyle: {
            background: "#fff",
            color: "var(--color-deep-blue)",
            borderRadius: 999,
            height: 36,
            padding: "0 16px",
            fontSize: 14,
            fontWeight: 600,
          },
        });
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
      apply(patch({ paid: false, paid_to_manager: false }), () => setPaid(tx.id, false), "Marked unpaid");
    } else if (kind === "gallons") {
      apply(patch({ gallons }), () => setGallons(tx.id, gallons), `Changed to ${gal(gallons)}`);
    } else {
      apply((list) => list.filter((row) => row.id !== tx.id), () => deleteTransaction(tx.id), "Removed");
    }
  }

  // One tap, no question: easy to undo, and it happens many times a day.
  function markPaid(row: DriverDelivery, toManager: boolean) {
    const change = (list: DriverDelivery[]) =>
      list.map((r) => (r.id === row.id ? { ...r, paid: true, paid_to_manager: toManager } : r));
    // Paid to the driver is the usual case; the toast offers the manager.
    const done = toManager
      ? "Paid to the manager"
      : { text: "Paid to the driver", action: { label: "To manager", onClick: () => markPaid(row, true) } };
    apply(change, () => setPaid(row.id, true, toManager), done);
  }

  const amount = tx ? peso(tx.gallons * tx.unit_price) : "";
  const dialog = !ask || !tx
    ? { title: "", description: "", confirmLabel: "" }
    : ask.kind === "paid"
      ? {
          title: tx.paid_to_manager ? "Paid to the manager" : "Paid to the driver",
          description: `${tx.customerName}, ${amount}. Mark as unpaid, or change who received the money.`,
          confirmLabel: "Mark unpaid",
        }
      : ask.kind === "gallons"
        ? { title: "Change gallons", description: tx.customerName, confirmLabel: "Save" }
        : { title: "Remove this sale?", description: `${gal(tx.gallons)} for ${tx.customerName} will be deleted from the log.`, confirmLabel: "Remove" };

  return (
    <>
      <div className="pb-3">
        <Segmented
          label="Show"
          options={[
            { value: "all", label: `All ${rows.length}` },
            { value: "paid", label: `Paid ${paidCount}` },
            { value: "unpaid", label: `Unpaid ${rows.length - paidCount}` },
          ]}
          value={show}
          onChange={setShow}
        />
      </div>
      {shown.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-6 py-8 text-center text-[0.9375rem] text-ink-muted">
          {show === "paid" ? "Nothing is marked paid yet." : "Everything on this list is paid."}
        </p>
      )}
      <ul className={cn("card divide-y divide-border", shown.length === 0 && "hidden")}>
        {shown.map((row) => (
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
            {row.unit_price > 0 &&
              (row.paid ? (
                <button
                  type="button"
                  aria-label={`${row.customerName}: paid to the ${row.paid_to_manager ? "manager" : "driver"}. Tap to change`}
                  onClick={() => setAsk({ kind: "paid", tx: row })}
                  className={cn(
                    "press flex h-10 w-[5.5rem] shrink-0 flex-col items-center justify-center rounded-pill border text-sm leading-tight font-semibold",
                    row.paid_to_manager
                      ? "border-deep-blue/30 bg-tint text-deep-blue"
                      : "border-success-ink/30 bg-success/10 text-success-ink"
                  )}
                >
                  Paid
                  <span className="text-[0.6875rem] font-medium">{row.paid_to_manager ? "to manager" : "to driver"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={`${row.customerName}: unpaid. Tap when paid`}
                  onClick={() => markPaid(row, false)}
                  className="press h-10 w-[5.5rem] shrink-0 rounded-pill border border-danger-ink/30 bg-danger/10 text-sm font-semibold text-danger-ink"
                >
                  Unpaid
                </button>
              ))}
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
        danger={ask?.kind === "delete" || ask?.kind === "paid"}
        onConfirm={confirm}
        onCancel={() => setAsk(null)}
      >
        {ask?.kind === "paid" && tx && (
          <Button variant="secondary" onClick={() => markPaid(tx, !tx.paid_to_manager)} className="mt-4 w-full">
            {tx.paid_to_manager ? "Paid to the driver instead" : "Paid to the manager instead"}
          </Button>
        )}
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
