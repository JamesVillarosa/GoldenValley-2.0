"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  return (
    <p className="text-sm text-[var(--color-ink-muted)]">
      {format(now, "EEEE, MMM d")} · {format(now, "h:mm:ss a")}
    </p>
  );
}
