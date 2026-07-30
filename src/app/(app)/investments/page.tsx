import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, canWrite, isAdmin } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { InvestmentsClient } from "@/components/investments/investments-client";
import type { Account, Investment, OrganizationMember, Property } from "@/lib/types";

export default async function InvestmentsPage() {
  const session = await getSessionContext();
  if (!session?.activeOrgId) redirect("/login");

  const supabase = await createClient();
  const [{ data: investments }, { data: members }, { data: properties }, { data: accounts }, { data: org }] =
    await Promise.all([
      supabase
        .from("investments")
        .select("*")
        .eq("organization_id", session.activeOrgId)
        .order("date", { ascending: false }),
      supabase
        .from("organization_members")
        .select("*, profile:profiles(*)")
        .eq("organization_id", session.activeOrgId),
      supabase
        .from("properties")
        .select("*")
        .eq("organization_id", session.activeOrgId)
        .order("name"),
      supabase
        .from("accounts")
        .select("*")
        .eq("organization_id", session.activeOrgId)
        .eq("is_active", true),
      supabase.from("organizations").select("*").eq("id", session.activeOrgId).single(),
    ]);

  return (
    <div>
      <PageHeader
        title="Inversiones y participación"
        description="El capital aportado se suma a la participación de cada socio — nunca modifica automáticamente las acciones originales."
      />
      <InvestmentsClient
        investments={(investments ?? []) as Investment[]}
        members={(members ?? []) as unknown as OrganizationMember[]}
        properties={(properties ?? []) as Property[]}
        accounts={(accounts ?? []) as Account[]}
        currency={org?.currency ?? "BOB"}
        canWrite={canWrite(session.activeRole)}
        isAdmin={isAdmin(session.activeRole)}
      />
    </div>
  );
}
