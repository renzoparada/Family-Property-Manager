import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, canWrite } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { TasksClient } from "@/components/tasks/tasks-client";
import type { OrganizationMember, Property, Task } from "@/lib/types";

export default async function TasksPage() {
  const session = await getSessionContext();
  if (!session?.activeOrgId) redirect("/login");

  const supabase = await createClient();
  const [{ data: tasks }, { data: properties }, { data: members }] = await Promise.all([
    supabase
      .from("tasks")
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
      .from("organization_members")
      .select("*, profile:profiles(*)")
      .eq("organization_id", session.activeOrgId),
  ]);

  return (
    <div>
      <PageHeader title="Tareas" description="Tablero de seguimiento operativo — Pendientes, En proceso, En OBS y Finalizados." />
      <TasksClient
        tasks={(tasks ?? []) as Task[]}
        properties={(properties ?? []) as Property[]}
        members={(members ?? []) as unknown as OrganizationMember[]}
        canWrite={canWrite(session.activeRole)}
      />
    </div>
  );
}
