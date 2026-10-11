"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Trash } from "@phosphor-icons/react/dist/ssr";
import { deleteExpense } from "@/lib/actions/client";
import { ExpenseButton } from "@/components/expense-button";
import { peso } from "@/lib/format";
import type { Expense } from "@/lib/supabase/types";

/** What was spent in the viewed period. Adding is a small button; expenses are
 * mostly logged from the Deliver screen. */
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
  const [pending, startTransition] = useTransition();
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  function remove(expense: Expense) {
    startTransition(async () => {
      try {
        await deleteExpense(expense.id);
        toast.success("Expense deleted");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete.");
      }
    });
  }

  return (
    <section aria-labelledby="expenses-title">
      <div className="flex items-center justify-between pb-2">
        <h2 id="expenses-title" className="section-title">
          Expenses
          {total > 0 && <span className="num font-medium text-ink-muted"> · {peso(total)}</span>}
        </h2>
        <ExpenseButton
          today={today}
          className="press flex h-11 items-center gap-1.5 rounded-pill border border-border bg-surface px-4 font-display text-[0.9375rem] font-semibold text-deep-blue"
        >
          <Plus size={16} weight="bold" />
          Add
        </ExpenseButton>
      </div>
      <div className="card">
        {expenses.length === 0 ? (
          <p className="px-4 py-4 text-[0.9375rem] text-ink-muted">No expenses in this period.</p>
        ) : (
          <ul className="divide-y divide-border">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-1.5 pr-1.5 pl-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.category}</p>
                  <p className="truncate text-sm text-ink-muted">
                    {e.monthly
                      ? `Monthly bill, ${format(new Date(`${e.spent_on}T00:00`), "MMMM")}`
                      : format(new Date(`${e.spent_on}T00:00`), "MMM d")}
                    {e.note && ` · ${e.note}`}
                  </p>
                </div>
                <span className="num shrink-0 font-semibold">{peso(e.amount)}</span>
                <button
                  type="button"
                  aria-label={`Delete ${e.category} expense`}
                  disabled={pending}
                  onClick={() => remove(e)}
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
      </div>
    </section>
  );
}
