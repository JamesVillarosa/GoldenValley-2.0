import type { ReactNode } from "react";

export function PageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 pb-5">
      <div className="min-w-0">
        <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] text-ink">
          {title}
        </h1>
        {sub && <p className="mt-0.5 text-[0.9375rem] text-ink-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}
