"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Trash } from "@phosphor-icons/react/dist/ssr";
import { deleteTransaction } from "@/lib/actions/transactions";
import type { Transaction } from "@/lib/supabase/types";

export function TransactionHistoryList({
  customerId,
  transactions,
}: {
  customerId: string;
  transactions: Transaction[];
}) {
  const [items, setItems] = useState(transactions);

  async function handleDelete(id: string) {
    const previous = items;
    setItems((current) => current.filter((t) => t.id !== id));
    try {
      await deleteTransaction(id, customerId);
      toast("Transaction removed");
    } catch (error) {
      setItems(previous);
      toast.error(error instanceof Error ? error.message : "Could not remove.");
    }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-center text-sm text-[var(--color-ink-muted)]">
        No deliveries logged yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((tx) => (
        <li
          key={tx.id}
          className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
        >
          <div>
            <p className="font-display font-semibold tabular-nums">{tx.gallons} gal</p>
            <p className="text-sm text-[var(--color-ink-muted)]">
              {format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}
            </p>
          </div>
          <button
            type="button"
            aria-label="Delete transaction"
            onClick={() => handleDelete(tx.id)}
            className="grid h-9 w-9 place-items-center rounded-[var(--radius-pill)] text-[var(--color-ink-muted)] transition-transform duration-150 active:scale-[0.93]"
          >
            <Trash size={18} />
          </button>
        </li>
      ))}
    </ul>
  );
}
