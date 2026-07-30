import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, isAdmin } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { MembersClient } from "@/components/members/members-client";
import type { OrganizationMember } from "@/lib/types";

export default async function MembersPage() {
  const session = await getSessionContext();
  if (!session?.activeOrgId) redirect("/login");
  if (!isAdmin(session.activeRole)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("organization_members")
    .select("*, profile:profiles(*)")
    .eq("organization_id", session.activeOrgId)
    .order("created_at", { ascending: true });

  return (
    <div>
      <PageHeader title="Miembros" description="Roles y accesos de tu familia a este espacio." />
      <MembersClient
        members={(members ?? []) as unknown as OrganizationMember[]}
        currentUserId={session.userId}
      />
    </div>
  );
}
