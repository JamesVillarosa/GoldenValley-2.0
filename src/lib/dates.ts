import { addDays, addMonths, addWeeks, addYears, endOfMonth, endOfWeek, endOfYear, format, parseISO, startOfMonth, startOfWeek, startOfYear } from "date-fns";

// The business runs on Manila time; the server (Vercel) runs on UTC.
export function manilaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");

export function shiftDays(date: string, days: number): string {
  return iso(addDays(parseISO(date), days));
}

/** The station is closed on Sundays: nothing is delivered, expected or paid. */
export const isClosed = (date: string) => parseISO(date).getDay() === 0;

/** `date` itself when the station is open that day, otherwise the Saturday before. */
export const lastWorkday = (date = manilaToday()) => (isClosed(date) ? shiftDays(date, -1) : date);

/** The open day before (-1) or after (1) `date`. */
export function stepWorkday(date: string, step: 1 | -1): string {
  const next = shiftDays(date, step);
  return isClosed(next) ? shiftDays(next, step) : next;
}

export const PERIODS = ["day", "week", "month", "year"] as const;
export type Period = (typeof PERIODS)[number];

export interface Range {
  period: Period;
  from: string;
  to: string;
  label: string;
  prev: string;
  next: string;
  /** date_trunc unit for the chart buckets */
  unit: "day" | "month";
}

export function resolveRange(periodParam: string | undefined, dateParam: string | undefined): Range {
  const period = PERIODS.includes(periodParam as Period) ? (periodParam as Period) : "day";
  const today = manilaToday();
  const anchor = parseISO(lastWorkday(/^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "") ? dateParam! : today));

  switch (period) {
    case "week": {
      const from = startOfWeek(anchor, { weekStartsOn: 1 });
      const to = addDays(endOfWeek(anchor, { weekStartsOn: 1 }), -1); // Saturday
      return { period, from: iso(from), to: iso(to), label: `${format(from, "MMM d")} - ${format(to, "MMM d")}`, prev: iso(addWeeks(anchor, -1)), next: iso(addWeeks(anchor, 1)), unit: "day" };
    }
    case "month":
      return { period, from: iso(startOfMonth(anchor)), to: iso(endOfMonth(anchor)), label: format(anchor, "MMMM yyyy"), prev: iso(addMonths(anchor, -1)), next: iso(addMonths(anchor, 1)), unit: "day" };
    case "year":
      return { period, from: iso(startOfYear(anchor)), to: iso(endOfYear(anchor)), label: format(anchor, "yyyy"), prev: iso(addYears(anchor, -1)), next: iso(addYears(anchor, 1)), unit: "month" };
    default:
      return { period, from: iso(anchor), to: iso(anchor), label: iso(anchor) === today ? "Today" : format(anchor, "EEE, MMM d"), prev: stepWorkday(iso(anchor), -1), next: stepWorkday(iso(anchor), 1), unit: "day" };
  }
}
