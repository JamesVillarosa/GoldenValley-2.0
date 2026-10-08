"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drop, ListChecks, Wallet, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Transaction", icon: Drop },
  { href: "/dashboard", label: "Dashboard", icon: ListChecks },
  { href: "/salary", label: "Salary", icon: Wallet },
  { href: "/customers", label: "Customers", icon: UsersThree },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex h-16 w-full max-w-md items-stretch rounded-t-[var(--radius-lg)] border border-b-0 border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{ boxShadow: "var(--shadow-sheet)" }}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center justify-center gap-1"
            aria-current={active ? "page" : undefined}
          >
            <Icon
              size={22}
              weight={active ? "fill" : "regular"}
              color={active ? "var(--color-deep-blue)" : "var(--color-ink-muted)"}
            />
            <span
              className={cn(
                "text-[11px] font-medium",
                active ? "text-[var(--color-deep-blue)]" : "text-[var(--color-ink-muted)]"
              )}
            >
              {label}
            </span>
            <span
              className={cn(
                "h-0.5 w-6 rounded-full transition-colors",
                active ? "bg-[var(--color-aqua)]" : "bg-transparent"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
