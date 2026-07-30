import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, canWrite } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { ExpensesClient } from "@/components/expenses/expenses-client";
import type {
  Account,
  Environment,
  Expense,
  ExpenseCategory,
  OrganizationMember,
  Property,
} from "@/lib/types";

export default async function ExpensesPage() {
  const session = await getSessionContext();
  if (!session?.activeOrgId) redirect("/login");

  const supabase = await createClient();
  const [
    { data: expenses },
    { data: properties },
    { data: environments },
    { data: accounts },
    { data: categories },
    { data: org },
    { data: members },
  ] = await Promise.all([
    supabase
      .from("expenses")
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
      .from("expense_categories")
      .select("*")
      .eq("organization_id", session.activeOrgId)
      .order("name"),
    supabase.from("organizations").select("*").eq("id", session.activeOrgId).single(),
    supabase
      .from("organization_members")
      .select("*, profile:profiles(*)")
      .eq("organization_id", session.activeOrgId),
  ]);

  return (
    <div>
      <PageHeader title="Gastos" description="Registra cualquier gasto de tus propiedades." />
      <ExpensesClient
        expenses={(expenses ?? []) as Expense[]}
        properties={(properties ?? []) as Property[]}
        environments={(environments ?? []) as unknown as Environment[]}
        accounts={(accounts ?? []) as Account[]}
        categories={(categories ?? []) as ExpenseCategory[]}
        members={(members ?? []) as unknown as OrganizationMember[]}
        currency={org?.currency ?? "BOB"}
        canWrite={canWrite(session.activeRole)}
      />
    </div>
  );
}
