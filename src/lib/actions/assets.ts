"use server";

import { revalidatePath } from "next/cache";
import { requireWriteContext, parseAmount, str, safeAction, type ActionResult } from "@/lib/actions/util";

export async function createAsset(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase, orgId, userId } = await requireWriteContext();

    const propertyId = str(formData.get("property_id"));
    const detail = str(formData.get("detail"));
    if (!propertyId || !detail) throw new Error("Completa la propiedad y el detalle.");

    const quantityRaw = str(formData.get("quantity"));
    const quantity = quantityRaw ? Math.max(1, Math.round(Number(quantityRaw))) : 1;
    const sourceNeedId = str(formData.get("source_need_id"));

    const { error } = await supabase.from("assets").insert({
      organization_id: orgId,
      property_id: propertyId,
      environment_id: str(formData.get("environment_id")),
      detail,
      acquired_date: str(formData.get("acquired_date")) ?? new Date().toISOString().slice(0, 10),
      cost: parseAmount(formData.get("cost")),
      quantity,
      notes: str(formData.get("notes")),
      source_need_id: sourceNeedId,
      created_by: userId,
    });
    if (error) {
      if (error.code === "23505") {
        throw new Error("Esa necesidad ya se registró como activo fijo.");
      }
      throw new Error(error.message);
    }

    revalidatePath("/assets");
    revalidatePath("/needs");
    return { error: null };
  });
}

export async function updateAsset(assetId: string, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();

    const propertyId = str(formData.get("property_id"));
    const detail = str(formData.get("detail"));
    if (!propertyId || !detail) throw new Error("Completa la propiedad y el detalle.");

    const quantityRaw = str(formData.get("quantity"));
    const quantity = quantityRaw ? Math.max(1, Math.round(Number(quantityRaw))) : 1;

    const { error } = await supabase
      .from("assets")
      .update({
        property_id: propertyId,
        environment_id: str(formData.get("environment_id")),
        detail,
        acquired_date: str(formData.get("acquired_date")) ?? new Date().toISOString().slice(0, 10),
        cost: parseAmount(formData.get("cost")),
        quantity,
        notes: str(formData.get("notes")),
      })
      .eq("id", assetId);
    if (error) throw new Error(error.message);

    revalidatePath("/assets");
    return { error: null };
  });
}

export async function deleteAsset(assetId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();
    const { error } = await supabase.from("assets").delete().eq("id", assetId);
    if (error) throw new Error(error.message);
    revalidatePath("/assets");
    revalidatePath("/needs");
    return { error: null };
  });
}
