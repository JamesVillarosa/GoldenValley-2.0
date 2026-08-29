"use client";

import { useId } from "react";
import type { CustomerStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const DROPLET_PATH =
  "M12 2.5C12 2.5 4.5 12.1 4.5 17.2C4.5 21.5 7.9 25 12 25C16.1 25 19.5 21.5 19.5 17.2C19.5 12.1 12 2.5 12 2.5Z";

const STATUS_COLOR: Record<CustomerStatus, string> = {
  on_schedule: "var(--color-deep-blue)",
  due_soon: "var(--color-warning)",
  overdue: "var(--color-danger)",
  new: "var(--color-ink-muted)",
};

const STATUS_LABEL: Record<CustomerStatus, string> = {
  on_schedule: "On schedule",
  due_soon: "Due soon",
  overdue: "Overdue",
  new: "No delivery history yet",
};

export function DropletStatus({
  status,
  size = 20,
  className,
}: {
  status: CustomerStatus;
  size?: 16 | 20 | 28;
  className?: string;
}) {
  const clipId = useId();
  const color = STATUS_COLOR[status];

  return (
    <svg
      viewBox="0 0 24 27"
      width={size}
      height={(size * 27) / 24}
      className={cn("shrink-0", className)}
      role="img"
      aria-label={STATUS_LABEL[status]}
    >
      {status === "on_schedule" && (
        <path d={DROPLET_PATH} fill={color} />
      )}

      {status === "due_soon" && (
        <>
          <clipPath id={clipId}>
            <rect x="0" y="13.5" width="24" height="13.5" />
          </clipPath>
          <path
            d={DROPLET_PATH}
            fill="none"
            stroke={color}
            strokeWidth="1.75"
          />
          <path d={DROPLET_PATH} fill={color} clipPath={`url(#${clipId})`} />
        </>
      )}

      {(status === "overdue" || status === "new") && (
        <path
          d={DROPLET_PATH}
          fill="none"
          stroke={color}
          strokeWidth="1.75"
          strokeDasharray={status === "new" ? "2.5 2.5" : undefined}
        />
      )}
    </svg>
  );
}
