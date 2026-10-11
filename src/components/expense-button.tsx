"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { addExpense } from "@/lib/actions/client";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Segmented } from "@/components/segmented";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { peso } from "@/lib/format";

const OTHER = "Other";
const SUGGESTED = {
  daily: ["Gas", "Maintenance", "Filters", "Seals", OTHER],
  monthly: ["Meralco", "Water bill", "Rent", OTHER],
};
type Kind = keyof typeof SUGGESTED;

const without = (all: Record<string, string>, key: string) =>
  Object.fromEntries(Object.entries(all).filter(([k]) => k !== key));

/** A button that opens a small pop-up to log expenses, so it never sits in the
 * way of the screen it is on. Several can be picked at once, each with its
 * own amount. */
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
  // Picked expenses and the amount typed for each.
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [otherName, setOtherName] = useState("");
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);

  const picked = SUGGESTED[kind].filter((c) => c in amounts);
  const rows = picked.map((c) => ({
    key: c,
    category: c === OTHER ? otherName.trim() : c,
    amount: Number(amounts[c]),
  }));
  const ready = rows.length > 0 && rows.every((r) => r.category && r.amount > 0);

  function toggle(c: string) {
    setAmounts((all) => (c in all ? without(all, c) : { ...all, [c]: "" }));
  }

  function reset() {
    setAmounts({});
    setOtherName("");
  }

  async function save() {
    setBusy(true);
    try {
      for (const row of rows) {
        await addExpense({ category: row.category, amount: row.amount, date, monthly: kind === "monthly" });
        // Saved rows leave the list, so a failure halfway never saves one twice.
        setAmounts((all) => without(all, row.key));
      }
      toast.success(`${peso(rows.reduce((sum, r) => sum + r.amount, 0))} in expenses added`);
      setOpen(false);
      reset();
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
        title="Add expenses"
        description={
          kind === "daily"
            ? "Tap everything you paid for, then type each amount."
            : "Bills for the whole month. Counted in the Month and Year views."
        }
        confirmLabel="Add"
        loading={busy}
        confirmDisabled={!ready}
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
              reset();
            }}
          />
          <div className="flex flex-wrap gap-2">
            {SUGGESTED[kind].map((c) => (
              <Chip key={c} label={c} active={c in amounts} onClick={() => toggle(c)} />
            ))}
          </div>

          {picked.map((c) => (
            <div key={c} className="flex items-center gap-2">
              {c === OTHER ? (
                <Input
                  aria-label="Other expense: what for"
                  autoComplete="off"
                  placeholder="What for"
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                  className="min-w-0 flex-1"
                />
              ) : (
                <span className="min-w-0 flex-1 truncate font-medium">{c}</span>
              )}
              <span className="text-ink-muted">₱</span>
              <Input
                aria-label={`${c} amount in pesos`}
                type="number"
                min={0.01}
                step="any"
                inputMode="decimal"
                value={amounts[c]}
                onChange={(e) => setAmounts((all) => ({ ...all, [c]: e.target.value }))}
                className="w-28 text-right"
              />
            </div>
          ))}

          <label className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-border px-4 text-[0.9375rem] text-ink-muted">
            {kind === "daily" ? "Date" : "Any day in the month"}
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value || today)}
              className="num h-11 bg-transparent text-right font-medium text-ink outline-none"
            />
          </label>
        </div>
      </ConfirmDialog>
    </>
  );
}
