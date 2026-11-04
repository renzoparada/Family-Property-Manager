"use server";

import { revalidatePath } from "next/cache";
import { requireWriteContext, str, safeAction, type ActionResult } from "@/lib/actions/util";
import type { NeedPriority, NeedStatus } from "@/lib/types";

export async function createNeed(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase, orgId, userId } = await requireWriteContext();

    const propertyId = str(formData.get("property_id"));
    const title = str(formData.get("title"));
    if (!propertyId || !title) throw new Error("Completa la propiedad y el nombre.");

    const estimatedCostRaw = str(formData.get("estimated_cost"));

    const { error } = await supabase.from("needs").insert({
      organization_id: orgId,
      property_id: propertyId,
      environment_id: str(formData.get("environment_id")),
      title,
      notes: str(formData.get("notes")),
      estimated_cost: estimatedCostRaw ? Number(estimatedCostRaw) : null,
      priority: (str(formData.get("priority")) ?? "media") as NeedPriority,
      created_by: userId,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/needs");
    return { error: null };
  });
}

export async function updateNeed(needId: string, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();

    const propertyId = str(formData.get("property_id"));
    const title = str(formData.get("title"));
    if (!propertyId || !title) throw new Error("Completa la propiedad y el nombre.");

    const estimatedCostRaw = str(formData.get("estimated_cost"));

    const { error } = await supabase
      .from("needs")
      .update({
        property_id: propertyId,
        environment_id: str(formData.get("environment_id")),
        title,
        notes: str(formData.get("notes")),
        estimated_cost: estimatedCostRaw ? Number(estimatedCostRaw) : null,
        priority: (str(formData.get("priority")) ?? "media") as NeedPriority,
      })
      .eq("id", needId);
    if (error) throw new Error(error.message);

    revalidatePath("/needs");
    return { error: null };
  });
}

export async function setNeedStatus(needId: string, status: NeedStatus): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();
    const { error } = await supabase
      .from("needs")
      .update({
        status,
        purchased_at: status === "comprado" ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq("id", needId);
    if (error) throw new Error(error.message);
    revalidatePath("/needs");
    return { error: null };
  });
}

export async function deleteNeed(needId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();
    const { error } = await supabase.from("needs").delete().eq("id", needId);
    if (error) throw new Error(error.message);
    revalidatePath("/needs");
    return { error: null };
  });
}
