import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, canWrite } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { AssetsClient } from "@/components/assets/assets-client";
import type { Asset, Environment, Property } from "@/lib/types";

export default async function AssetsPage() {
  const session = await getSessionContext();
  if (!session?.activeOrgId) redirect("/login");

  const supabase = await createClient();
  const [{ data: assets }, { data: properties }, { data: environments }, { data: org }] = await Promise.all([
    supabase
      .from("assets")
      .select("*")
      .eq("organization_id", session.activeOrgId)
      .order("acquired_date", { ascending: false }),
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
    supabase.from("organizations").select("*").eq("id", session.activeOrgId).single(),
  ]);

  return (
    <div>
      <PageHeader
        title="Activos fijos"
        description="Inventario de muebles, equipos y herramientas ya comprados."
      />
      <AssetsClient
        assets={(assets ?? []) as Asset[]}
        properties={(properties ?? []) as Property[]}
        environments={(environments ?? []) as unknown as Environment[]}
        currency={org?.currency ?? "BOB"}
        canWrite={canWrite(session.activeRole)}
      />
    </div>
  );
}
