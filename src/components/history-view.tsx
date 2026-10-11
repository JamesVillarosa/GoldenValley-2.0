"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { CaretLeft, CaretRight, Drop } from "@phosphor-icons/react/dist/ssr";
import { DayTotal, DeliveryList } from "@/components/delivery-list";
import { PageHeader } from "@/components/page-header";
import { getDriverDeliveries, type DriverDelivery } from "@/lib/actions/transactions";
import { isClosed, manilaToday, stepWorkday } from "@/lib/dates";

const STEP = "press grid h-11 w-11 shrink-0 place-items-center rounded-pill border border-border bg-surface text-deep-blue";

/** Everything sold on one day, every driver and walk-in together. */
export function HistoryView({ today }: { today: string }) {
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<DriverDelivery[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDriverDeliveries("all", date)
      .then((data) => !cancelled && setRows(data))
      .catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, [date]);

  function go(next: string) {
    if (next > today || isClosed(next) || next === date) return;
    setRows(null);
    setDate(next);
  }

  return (
    <div className="page">
      <PageHeader title="History" sub="Everyone who ordered on a day" />

      <div className="flex items-center gap-2 pb-5">
        <button type="button" aria-label="Day before" onClick={() => go(stepWorkday(date, -1))} className={STEP}>
          <CaretLeft size={18} weight="bold" />
        </button>
        <label className="card flex h-11 min-w-0 flex-1 items-center justify-center gap-2 px-3 font-display font-semibold">
          <span className="truncate">{date === manilaToday() ? "Today" : format(parseISO(date), "EEE, MMM d")}</span>
          <input
            type="date"
            aria-label="Pick a day"
            value={date}
            max={today}
            onChange={(e) => go(e.target.value || today)}
            className="num w-[1.75rem] bg-transparent text-transparent outline-none"
          />
        </label>
        <button
          type="button"
          aria-label="Day after"
          disabled={date >= today}
          onClick={() => go(stepWorkday(date, 1))}
          className={`${STEP} disabled:opacity-30`}
        >
          <CaretRight size={18} weight="bold" />
        </button>
      </div>

      {rows === null ? (
        <div className="card h-[4.25rem] animate-pulse" aria-label="Loading" />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <Drop size={28} weight="light" className="text-ink-muted" />
          <p className="text-[0.9375rem] text-ink-muted">Nothing was sold on this day.</p>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between pb-2">
            <h2 className="section-title">Total gallons</h2>
            <DayTotal rows={rows} />
          </div>
          <DeliveryList rows={rows} setRows={setRows} showDriver />
        </>
      )}
    </div>
  );
}
