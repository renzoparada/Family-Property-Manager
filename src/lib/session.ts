import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole, Organization } from "@/lib/types";

export const ACTIVE_ORG_COOKIE = "fpm_org";

export interface SessionMembership {
  organization_id: string;
  role: MemberRole;
  initial_share_percentage: number;
  organization: Organization;
}

export interface SessionContext {
  userId: string;
  email: string | null;
  memberships: SessionMembership[];
  activeOrgId: string | null;
  activeRole: MemberRole | null;
}

/** Server-side session + active organization resolution. Returns null if unauthenticated. */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberRows } = await supabase
    .from("organization_members")
    .select("organization_id, role, initial_share_percentage, organization:organizations(*)")
    .eq("user_id", user.id);

  const memberships = (memberRows ?? []).map((m) => ({
    organization_id: m.organization_id,
    role: m.role,
    initial_share_percentage: m.initial_share_percentage,
    organization: Array.isArray(m.organization) ? m.organization[0] : m.organization,
  })) as SessionMembership[];

  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;
  const active =
    memberships.find((m) => m.organization_id === cookieOrgId) ??
    memberships[0] ??
    null;

  return {
    userId: user.id,
    email: user.email ?? null,
    memberships,
    activeOrgId: active?.organization_id ?? null,
    activeRole: active?.role ?? null,
  };
}

export function canWrite(role: MemberRole | null) {
  return role === "admin" || role === "socio" || role === "contador";
}

export function isAdmin(role: MemberRole | null) {
  return role === "admin";
}
