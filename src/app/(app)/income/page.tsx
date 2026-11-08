import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, canWrite } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { IncomeClient } from "@/components/income/income-client";
import type {
  Account,
  Environment,
  Income,
  IncomeCategory,
  OrganizationMember,
  Property,
} from "@/lib/types";

export default async function IncomePage() {
  const session = await getSessionContext();
  if (!session?.activeOrgId) redirect("/login");

  const supabase = await createClient();
  const [
    { data: incomes },
    { data: properties },
    { data: environments },
    { data: accounts },
    { data: categories },
    { data: org },
    { data: members },
    { data: attachments },
  ] = await Promise.all([
    supabase
      .from("incomes")
      .select("*")
      .eq("organization_id", session.activeOrgId)
      .order("date", { ascending: false }),
    supabase
      .from("properties")
      .select("*")
      .eq("organization_id", session.activeOrgId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("environments")
      .select("*, property:properties!inner(organization_id)")
      .eq("property.organization_id", session.activeOrgId),
    supabase
      .from("accounts")
      .select("*")
      .eq("organization_id", session.activeOrgId)
      .eq("is_active", true),
    supabase
      .from("income_categories")
      .select("*")
      .eq("organization_id", session.activeOrgId)
      .order("name"),
    supabase.from("organizations").select("*").eq("id", session.activeOrgId).single(),
    supabase
      .from("organization_members")
      .select("*, profile:profiles(*)")
      .eq("organization_id", session.activeOrgId),
    supabase
      .from("attachments")
      .select("entity_id")
      .eq("organization_id", session.activeOrgId)
      .eq("entity_type", "income"),
  ]);

  const attachmentCounts: Record<string, number> = {};
  for (const a of attachments ?? []) {
    attachmentCounts[a.entity_id] = (attachmentCounts[a.entity_id] ?? 0) + 1;
  }

  return (
    <div>
      <PageHeader
        title="Ingresos"
        description="Ventas, entradas y otros ingresos del negocio — distinto de Reservas, que es solo para alojamiento."
      />
      <IncomeClient
        incomes={(incomes ?? []) as Income[]}
        properties={(properties ?? []) as Property[]}
        environments={(environments ?? []) as unknown as Environment[]}
        accounts={(accounts ?? []) as Account[]}
        categories={(categories ?? []) as IncomeCategory[]}
        members={(members ?? []) as unknown as OrganizationMember[]}
        attachmentCounts={attachmentCounts}
        currency={org?.currency ?? "BOB"}
        canWrite={canWrite(session.activeRole)}
      />
    </div>
  );
}
