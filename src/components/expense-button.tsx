"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { addExpense } from "@/lib/actions/client";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Segmented } from "@/components/segmented";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { peso } from "@/lib/format";

// Suggestions only: any other expense can be typed in.
const SUGGESTED = {
  daily: ["Gas", "Maintenance", "Filters", "Seals"],
  monthly: ["Meralco", "Water bill", "Rent"],
};
type Kind = keyof typeof SUGGESTED;

/** A button that opens a small pop-up to log an expense, so it never sits in
 * the way of the screen it is on. */
export function ExpenseButton({
  today,
  className,
  children,
}: {
  today: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("daily");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await addExpense({ category, amount: Number(amount), date, monthly: kind === "monthly" });
      toast.success(`${category} ${peso(Number(amount))} added`);
      setOpen(false);
      setCategory("");
      setAmount("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save. Check your signal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <ConfirmDialog
        open={open}
        title="Add an expense"
        description={kind === "daily" ? "Money spent on a day." : "A bill for the whole month. Counted in the Month and Year views."}
        confirmLabel="Add"
        loading={busy}
        confirmDisabled={!category.trim() || !(Number(amount) > 0)}
        onConfirm={save}
        onCancel={() => setOpen(false)}
      >
        <div className="mt-4 flex flex-col gap-3">
          <Segmented
            label="Kind of expense"
            options={[
              { value: "daily", label: "Day to day" },
              { value: "monthly", label: "Monthly bill" },
            ]}
            value={kind}
            onChange={(next) => {
              setKind(next);
              setCategory("");
            }}
          />
          <div className="flex flex-wrap gap-2">
            {SUGGESTED[kind].map((c) => (
              <Chip key={c} label={c} active={c === category} onClick={() => setCategory(c)} />
            ))}
          </div>
          <div>
            <label htmlFor="expense-category" className="field-label">
              What for
            </label>
            <Input
              id="expense-category"
              autoComplete="off"
              placeholder="Or type another expense"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor="expense-amount" className="field-label">
                Amount (₱)
              </label>
              <Input
                id="expense-amount"
                type="number"
                min={0.01}
                step="any"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="expense-date" className="field-label">
                {kind === "daily" ? "Date" : "Any day in the month"}
              </label>
              <Input id="expense-date" type="date" className="px-2 text-[0.9375rem]" max={today} value={date} onChange={(e) => setDate(e.target.value || today)} />
            </div>
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
}
