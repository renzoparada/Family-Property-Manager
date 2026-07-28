"use client";

import { useState } from "react";
import { NavLinks } from "@/components/layout/nav-links";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { SignOutButton } from "@/components/layout/sign-out-button";
import type { MemberRole } from "@/lib/types";
import type { SessionMembership } from "@/lib/session";

export function AppShell({
  role,
  memberships,
  activeOrgId,
  userEmail,
  children,
}: {
  role: MemberRole | null;
  memberships: SessionMembership[];
  activeOrgId: string | null;
  userEmail: string | null;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] py-5 md:flex">
        <div className="mb-6 px-4">
          <OrgSwitcher memberships={memberships} activeOrgId={activeOrgId} />
        </div>
        <NavLinks role={role} />
        <div className="mt-auto space-y-2 px-4 pt-4">
          <div className="truncate text-xs text-[var(--color-muted)]">{userEmail}</div>
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="btn-ghost !px-2"
            aria-label="Abrir menú"
          >
            ≡ Menú
          </button>
          <OrgSwitcher memberships={memberships} activeOrgId={activeOrgId} />
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative flex w-64 flex-col bg-[var(--color-surface)] py-5">
              <div className="mb-6 flex items-center justify-between px-4">
                <OrgSwitcher memberships={memberships} activeOrgId={activeOrgId} />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="btn-ghost !px-2"
                  aria-label="Cerrar menú"
                >
                  ✕
                </button>
              </div>
              <NavLinks role={role} onNavigate={() => setMobileOpen(false)} />
              <div className="mt-auto space-y-2 px-4 pt-4">
                <div className="truncate text-xs text-[var(--color-muted)]">
                  {userEmail}
                </div>
                <div className="flex items-center justify-between">
                  <ThemeToggle />
                  <SignOutButton />
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 bg-[var(--color-canvas)] p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
