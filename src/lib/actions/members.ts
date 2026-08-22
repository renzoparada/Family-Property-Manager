"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext, str, safeAction, type ActionResult } from "@/lib/actions/util";
import type { MemberRole } from "@/lib/types";

export async function inviteMember(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase, orgId } = await requireAdminContext();

    const email = str(formData.get("email"))?.toLowerCase();
    const role = (str(formData.get("role")) ?? "socio") as MemberRole;
    if (!email) throw new Error("Ingresa un correo.");

    const { data: userId, error: lookupError } = await supabase.rpc(
      "fn_find_user_id_by_email",
      { p_email: email }
    );
    if (lookupError) throw new Error(lookupError.message);

    if (!userId) {
      throw new Error(
        "Esa persona todavía no tiene cuenta. Pídele que se registre en la app con ese correo y vuelve a intentarlo."
      );
    }

    const { error } = await supabase.from("organization_members").insert({
      organization_id: orgId,
      user_id: userId,
      role,
      initial_share_percentage: 0,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/members");
    return { error: null };
  });
}

export async function updateMemberRole(memberId: string, role: MemberRole): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireAdminContext();
    const { error } = await supabase
      .from("organization_members")
      .update({ role })
      .eq("id", memberId);
    if (error) throw new Error(error.message);
    revalidatePath("/members");
    return { error: null };
  });
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireAdminContext();
    const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
    if (error) throw new Error(error.message);
    revalidatePath("/members");
    return { error: null };
  });
}
