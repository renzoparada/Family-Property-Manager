import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, canWrite } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { NeedsClient } from "@/components/needs/needs-client";
import type { Environment, Need, Property } from "@/lib/types";

export default async function NeedsPage() {
  const session = await getSessionContext();
  if (!session?.activeOrgId) redirect("/login");

  const supabase = await createClient();
  const [{ data: needs }, { data: properties }, { data: environments }, { data: org }, { data: assetLinks }] =
    await Promise.all([
      supabase
        .from("needs")
        .select("*")
        .eq("organization_id", session.activeOrgId)
        .order("created_at", { ascending: false }),
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
      supabase
        .from("assets")
        .select("source_need_id")
        .eq("organization_id", session.activeOrgId)
        .not("source_need_id", "is", null),
    ]);

  const convertedNeedIds = (assetLinks ?? [])
    .map((a) => a.source_need_id)
    .filter((id): id is string => Boolean(id));

  return (
    <div>
      <PageHeader
        title="Necesidades"
        description="Lista de compras y pendientes por propiedad — antes de que se conviertan en gasto."
      />
      <NeedsClient
        needs={(needs ?? []) as Need[]}
        properties={(properties ?? []) as Property[]}
        environments={(environments ?? []) as unknown as Environment[]}
        convertedNeedIds={convertedNeedIds}
        currency={org?.currency ?? "BOB"}
        canWrite={canWrite(session.activeRole)}
      />
    </div>
  );
}
