import { cn } from "@/lib/utils";

/** A tappable suggestion that fills a nearby field. */
export function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "press h-11 rounded-pill border px-4 text-[0.9375rem] font-medium transition-colors duration-150",
        active ? "border-deep-blue bg-deep-blue text-white" : "border-border bg-surface text-deep-blue"
      )}
    >
      {label}
    </button>
  );
}
