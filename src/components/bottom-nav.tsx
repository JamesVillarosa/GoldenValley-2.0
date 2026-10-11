"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, ChartBar, ClockCounterClockwise, Drop, UsersThree, Wallet } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Deliver", icon: Drop },
  { href: "/due", label: "Due", icon: CalendarCheck },
  { href: "/history", label: "History", icon: ClockCounterClockwise },
  { href: "/salary", label: "Salary", icon: Wallet },
  { href: "/dashboard", label: "Dashboard", icon: ChartBar },
  { href: "/customers", label: "Customers", icon: UsersThree },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex h-[var(--nav-height)] w-full max-w-md items-start border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            // Load every tab ahead of the tap so switching never waits.
            prefetch
            aria-current={active ? "page" : undefined}
            className="flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1"
          >
            <span
              className={cn(
                "grid h-7 w-12 place-items-center rounded-pill transition-colors duration-200",
                active ? "bg-tint text-deep-blue" : "text-ink-muted"
              )}
            >
              <Icon size={22} weight={active ? "fill" : "regular"} />
            </span>
            <span
              className={cn(
                "text-[0.625rem] font-medium tracking-tight min-[400px]:text-[0.6875rem]",
                active ? "text-deep-blue" : "text-ink-muted"
              )}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
