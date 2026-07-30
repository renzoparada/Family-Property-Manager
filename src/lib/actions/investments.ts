"use server";

import { revalidatePath } from "next/cache";
import { requireWriteContext, requireAdminContext, parseAmount, str } from "@/lib/actions/util";

export async function createInvestment(formData: FormData) {
  const { supabase, orgId, userId } = await requireWriteContext();

  const memberId = str(formData.get("member_id"));
  const amount = parseAmount(formData.get("amount"));
  const description = str(formData.get("description"));
  const date = str(formData.get("date")) ?? new Date().toISOString().slice(0, 10);
  if (!memberId || amount <= 0 || !description) {
    throw new Error("Completa familiar, monto y descripción.");
  }

  const accountId = str(formData.get("account_id"));

  const { data, error } = await supabase
    .from("investments")
    .insert({
      organization_id: orgId,
      property_id: str(formData.get("property_id")),
      environment_id: str(formData.get("environment_id")),
      member_id: memberId,
      date,
      amount,
      description,
      account_id: accountId,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  if (accountId) {
    await supabase.from("transactions").insert({
      organization_id: orgId,
      account_id: accountId,
      date,
      amount,
      description: `Inversión — ${description}`,
      source_type: "investment",
      source_id: data.id,
      created_by: userId,
    });
  }

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function updateInitialShare(memberId: string, percentage: number) {
  const { supabase } = await requireAdminContext();
  const { error } = await supabase
    .from("organization_members")
    .update({ initial_share_percentage: percentage })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
  revalidatePath("/investments");
  revalidatePath("/members");
}
