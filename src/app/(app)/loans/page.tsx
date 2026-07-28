import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, canWrite } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { LoansClient } from "@/components/loans/loans-client";
import type { Account, Loan, LoanPayment, OrganizationMember } from "@/lib/types";

export default async function LoansPage() {
  const session = await getSessionContext();
  if (!session?.activeOrgId) redirect("/login");

  const supabase = await createClient();
  const [{ data: loans }, { data: members }, { data: accounts }, { data: org }, { data: payments }] =
    await Promise.all([
      supabase
        .from("loans")
        .select("*")
        .eq("organization_id", session.activeOrgId)
        .order("date", { ascending: false }),
      supabase
        .from("organization_members")
        .select("*, profile:profiles(*)")
        .eq("organization_id", session.activeOrgId),
      supabase
        .from("accounts")
        .select("*")
        .eq("organization_id", session.activeOrgId)
        .eq("is_active", true),
      supabase.from("organizations").select("*").eq("id", session.activeOrgId).single(),
      supabase
        .from("loan_payments")
        .select("*, loan:loans!inner(organization_id)")
        .eq("loan.organization_id", session.activeOrgId),
    ]);

  return (
    <div>
      <PageHeader
        title="Préstamos familiares"
        description="Dinero que un familiar aporta a la sociedad — una cuenta por pagar, no un gasto."
      />
      <LoansClient
        loans={(loans ?? []) as Loan[]}
        payments={(payments ?? []) as unknown as LoanPayment[]}
        members={(members ?? []) as unknown as OrganizationMember[]}
        accounts={(accounts ?? []) as Account[]}
        currency={org?.currency ?? "BOB"}
        canWrite={canWrite(session.activeRole)}
      />
    </div>
  );
}
