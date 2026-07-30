"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MemberRole } from "@/lib/types";

const NAV_ITEMS: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Panel" },
  { href: "/properties", label: "Propiedades" },
  { href: "/reservations", label: "Reservas" },
  { href: "/expenses", label: "Gastos" },
  { href: "/loans", label: "Préstamos" },
  { href: "/investments", label: "Inversiones y participación" },
  { href: "/accounts", label: "Caja y bancos" },
  { href: "/reports", label: "Reportes" },
  { href: "/members", label: "Miembros", adminOnly: true },
];

export function NavLinks({
  role,
  onNavigate,
}: {
  role: MemberRole | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin").map(
        (item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-ink)]"
              }`}
            >
              {item.label}
            </Link>
          );
        }
      )}
    </nav>
  );
}
