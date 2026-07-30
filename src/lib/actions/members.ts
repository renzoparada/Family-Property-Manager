"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext, str } from "@/lib/actions/util";
import type { MemberRole } from "@/lib/types";

export async function inviteMember(formData: FormData) {
  const { supabase, orgId } = await requireAdminContext();

  const email = str(formData.get("email"))?.toLowerCase();
  const role = (str(formData.get("role")) ?? "socio") as MemberRole;
  if (!email) throw new Error("Ingresa un correo.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    throw new Error(
      "Esa persona todavía no tiene cuenta. Pídele que se registre en la app con ese correo y vuelve a intentarlo."
    );
  }

  const { error } = await supabase.from("organization_members").insert({
    organization_id: orgId,
    user_id: profile.id,
    role,
    initial_share_percentage: 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/members");
}

export async function updateMemberRole(memberId: string, role: MemberRole) {
  const { supabase } = await requireAdminContext();
  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
  revalidatePath("/members");
}

export async function removeMember(memberId: string) {
  const { supabase } = await requireAdminContext();
  const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
  if (error) throw new Error(error.message);
  revalidatePath("/members");
}
