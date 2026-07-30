import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { ReportsClient } from "@/components/reports/reports-client";
import type {
  Expense,
  ExpenseCategory,
  Investment,
  Loan,
  OrganizationMember,
  Property,
  Reservation,
} from "@/lib/types";

export default async function ReportsPage() {
  const session = await getSessionContext();
  if (!session?.activeOrgId) redirect("/login");
  const orgId = session.activeOrgId;

  const supabase = await createClient();
  const [
    { data: reservations },
    { data: expenses },
    { data: investments },
    { data: loans },
    { data: properties },
    { data: categories },
    { data: members },
    { data: org },
  ] = await Promise.all([
    supabase.from("reservations").select("*").eq("organization_id", orgId),
    supabase.from("expenses").select("*").eq("organization_id", orgId),
    supabase.from("investments").select("*").eq("organization_id", orgId),
    supabase.from("loans").select("*").eq("organization_id", orgId),
    supabase.from("properties").select("*").eq("organization_id", orgId),
    supabase.from("expense_categories").select("*").eq("organization_id", orgId),
    supabase.from("organization_members").select("*, profile:profiles(*)").eq("organization_id", orgId),
    supabase.from("organizations").select("*").eq("id", orgId).single(),
  ]);

  return (
    <div>
      <PageHeader title="Reportes" description="Analiza tu operación por propiedad, categoría, persona y plataforma." />
      <ReportsClient
        reservations={(reservations ?? []) as Reservation[]}
        expenses={(expenses ?? []) as Expense[]}
        investments={(investments ?? []) as Investment[]}
        loans={(loans ?? []) as Loan[]}
        properties={(properties ?? []) as Property[]}
        categories={(categories ?? []) as ExpenseCategory[]}
        members={(members ?? []) as unknown as OrganizationMember[]}
        currency={org?.currency ?? "BOB"}
      />
    </div>
  );
}
