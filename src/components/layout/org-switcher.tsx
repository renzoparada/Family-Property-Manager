"use client";

import { useRouter } from "next/navigation";
import { setActiveOrgCookie } from "@/lib/active-org";
import type { SessionMembership } from "@/lib/session";

export function OrgSwitcher({
  memberships,
  activeOrgId,
}: {
  memberships: SessionMembership[];
  activeOrgId: string | null;
}) {
  const router = useRouter();

  if (memberships.length <= 1) {
    return (
      <span className="truncate text-sm font-semibold text-[var(--color-ink)]">
        {memberships[0]?.organization.name ?? ""}
      </span>
    );
  }

  return (
    <select
      className="input !w-auto max-w-[180px] py-1 text-sm font-semibold"
      value={activeOrgId ?? ""}
      onChange={(e) => {
        setActiveOrgCookie(e.target.value);
        router.refresh();
      }}
    >
      {memberships.map((m) => (
        <option key={m.organization_id} value={m.organization_id}>
          {m.organization.name}
        </option>
      ))}
    </select>
  );
}
