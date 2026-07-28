import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, canWrite } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { AccountsClient } from "@/components/accounts/accounts-client";
import type { Account, Transaction } from "@/lib/types";

export default async function AccountsPage() {
  const session = await getSessionContext();
  if (!session?.activeOrgId) redirect("/login");

  const supabase = await createClient();
  const [{ data: accounts }, { data: transactions }, { data: org }] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("organization_id", session.activeOrgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("*")
      .eq("organization_id", session.activeOrgId)
      .order("date", { ascending: false }),
    supabase
      .from("organizations")
      .select("*")
      .eq("id", session.activeOrgId)
      .single(),
  ]);

  return (
    <div>
      <PageHeader
        title="Caja y bancos"
        description="Saldo inicial, movimientos y saldo actual de cada cuenta."
      />
      <AccountsClient
        accounts={(accounts ?? []) as Account[]}
        transactions={(transactions ?? []) as Transaction[]}
        currency={org?.currency ?? "BOB"}
        canWrite={canWrite(session.activeRole)}
      />
    </div>
  );
}
