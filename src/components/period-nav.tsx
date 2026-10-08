import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { PERIODS, manilaToday, type Period, type Range } from "@/lib/dates";
import { cn } from "@/lib/utils";

const LABEL: Record<Period, string> = { day: "Day", week: "Week", month: "Month", year: "Year" };

/** Period tabs plus previous/next stepping, driven by ?p= and ?d= so the
 * screen stays server-rendered and the back button works. */
export function PeriodNav({
  path,
  range,
  periods = PERIODS,
}: {
  path: string;
  range: Range;
  periods?: readonly Period[];
}) {
  const href = (p: Period, d?: string) => `${path}?p=${p}${d ? `&d=${d}` : ""}`;
  const atPresent = range.to >= manilaToday();

  return (
    <div className="flex flex-col gap-3 pb-5">
      <div className="flex gap-1 rounded-pill border border-border bg-surface p-1">
        {periods.map((p) => (
          <Link
            key={p}
            href={href(p)}
            replace
            aria-current={p === range.period ? "true" : undefined}
            className={cn(
              "grid h-10 flex-1 place-items-center rounded-pill font-display text-[0.9375rem] font-medium transition-colors duration-150",
              p === range.period ? "bg-deep-blue text-white" : "text-ink-muted"
            )}
          >
            {LABEL[p]}
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Link
          href={href(range.period, range.prev)}
          replace
          aria-label="Previous"
          className="press grid h-11 w-11 place-items-center rounded-pill border border-border bg-surface text-deep-blue"
        >
          <CaretLeft size={18} weight="bold" />
        </Link>
        <p className="font-display text-[1.0625rem] font-semibold text-ink">{range.label}</p>
        {atPresent ? (
          <span className="h-11 w-11" />
        ) : (
          <Link
            href={href(range.period, range.next)}
            replace
            aria-label="Next"
            className="press grid h-11 w-11 place-items-center rounded-pill border border-border bg-surface text-deep-blue"
          >
            <CaretRight size={18} weight="bold" />
          </Link>
        )}
      </div>
    </div>
  );
}
