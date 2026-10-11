"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Trash } from "@phosphor-icons/react/dist/ssr";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { peso } from "@/lib/format";
import type { Expense } from "@/lib/supabase/types";
import { addExpense, deleteExpense } from "@/lib/actions/client";

// Suggestions only: any other expense can be typed in.
const SUGGESTED = {
  daily: ["Gas", "Maintenance", "Filters", "Seals and caps"],
  monthly: ["Meralco", "Water bill", "Rent"],
};
type Kind = keyof typeof SUGGESTED;

export function ExpensePanel({
  expenses,
  today,
  longView,
}: {
  expenses: Expense[];
  today: string;
  /** Month or year view: monthly bills are listed and counted. */
  longView: boolean;
}) {
  const [kind, setKind] = useState<Kind>("daily");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
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
    <section aria-labelledby="expenses-title">
      <h2 id="expenses-title" className="section-title pb-2">
        Expenses
      </h2>
      <div className="card">
        {expenses.length === 0 ? (
          <p className="px-4 py-4 text-[0.9375rem] text-ink-muted">
            No expenses in this period. Add gas, maintenance or Meralco below so profit is real.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-1.5 pr-1.5 pl-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.category}</p>
                  <p className="truncate text-sm text-ink-muted">
                    {e.monthly ? `Monthly bill, ${format(new Date(`${e.spent_on}T00:00`), "MMMM")}` : format(new Date(`${e.spent_on}T00:00`), "MMM d")}
                    {e.note && ` · ${e.note}`}
                  </p>
                </div>
                <span className="num shrink-0 font-semibold">{peso(e.amount)}</span>
                <button
                  type="button"
                  aria-label={`Delete ${e.category} expense`}
                  disabled={pending}
                  onClick={() => run(() => deleteExpense(e.id), "Expense deleted")}
                  className="press grid h-11 w-11 shrink-0 place-items-center rounded-pill text-ink-muted"
                >
                  <Trash size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {!longView && (
          <p className="border-t border-border px-4 py-3 text-sm text-ink-muted">
            Monthly bills like Meralco are counted in the Month and Year views.
          </p>
        )}
        <details className="border-t border-border">
          <summary className="flex min-h-12 cursor-pointer items-center px-4 font-medium text-deep-blue">
            Add an expense
          </summary>
          <form
            className="flex flex-col gap-3 px-4 pb-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await addExpense({ category, amount: Number(amount), date, monthly: kind === "monthly" });
                setAmount("");
                setCategory("");
              }, "Expense added");
            }}
          >
            <Segmented
              label="Kind of expense"
              options={[
                { value: "daily", label: "Day to day" },
                { value: "monthly", label: "Monthly bill" },
              ]}
              value={kind}
              onChange={setKind}
            />
            <div>
              <label htmlFor="expense-category" className="field-label">
                What for
              </label>
              <Input
                id="expense-category"
                required
                autoComplete="off"
                placeholder={kind === "daily" ? "Gas, maintenance..." : "Meralco, water bill..."}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {SUGGESTED[kind].map((c) => (
                  <Chip key={c} label={c} active={c === category} onClick={() => setCategory(c)} />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <label htmlFor="expense-amount" className="field-label">
                  Amount (₱)
                </label>
                <Input
                  id="expense-amount"
                  required
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
                <Input id="expense-date" type="date" required max={today} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <Button type="submit" variant="secondary" disabled={pending}>
              {pending ? "Saving..." : "Add expense"}
            </Button>
          </form>
        </details>
      </div>
    </section>
  );
}
