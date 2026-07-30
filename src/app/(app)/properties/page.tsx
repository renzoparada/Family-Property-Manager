import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, canWrite } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { PropertiesClient } from "@/components/properties/properties-client";
import type { Environment, Property } from "@/lib/types";

export default async function PropertiesPage() {
  const session = await getSessionContext();
  if (!session?.activeOrgId) redirect("/login");

  const supabase = await createClient();
  const [{ data: properties }, { data: environments }] = await Promise.all([
    supabase
      .from("properties")
      .select("*")
      .eq("organization_id", session.activeOrgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("environments")
      .select("*, property:properties!inner(organization_id)")
      .eq("property.organization_id", session.activeOrgId)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div>
      <PageHeader
        title="Propiedades"
        description="Administra tus propiedades y sus ambientes."
      />
      <PropertiesClient
        properties={(properties ?? []) as Property[]}
        environments={(environments ?? []) as unknown as Environment[]}
        canWrite={canWrite(session.activeRole)}
      />
    </div>
  );
}
