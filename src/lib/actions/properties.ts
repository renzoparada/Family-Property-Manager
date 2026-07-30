"use server";

import { revalidatePath } from "next/cache";
import { requireWriteContext, str, safeAction, type ActionResult } from "@/lib/actions/util";

export async function createProperty(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase, orgId } = await requireWriteContext();
    const name = str(formData.get("name"));
    if (!name) throw new Error("El nombre es obligatorio.");

    const { error } = await supabase.from("properties").insert({
      organization_id: orgId,
      name,
      address: str(formData.get("address")),
    });
    if (error) throw new Error(error.message);
    revalidatePath("/properties");
    return { error: null };
  });
}

export async function updateProperty(propertyId: string, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();
    const name = str(formData.get("name"));
    if (!name) throw new Error("El nombre es obligatorio.");

    const { error } = await supabase
      .from("properties")
      .update({ name, address: str(formData.get("address")) })
      .eq("id", propertyId);
    if (error) throw new Error(error.message);
    revalidatePath("/properties");
    return { error: null };
  });
}

export async function archiveProperty(propertyId: string, isActive: boolean): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();
    const { error } = await supabase
      .from("properties")
      .update({ is_active: isActive })
      .eq("id", propertyId);
    if (error) throw new Error(error.message);
    revalidatePath("/properties");
    return { error: null };
  });
}

export async function createEnvironment(propertyId: string, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();
    const name = str(formData.get("name"));
    if (!name) throw new Error("El nombre es obligatorio.");

    const { error } = await supabase.from("environments").insert({
      property_id: propertyId,
      name,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/properties");
    return { error: null };
  });
}

export async function renameEnvironment(environmentId: string, name: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();
    if (!name.trim()) throw new Error("El nombre es obligatorio.");

    const { error } = await supabase
      .from("environments")
      .update({ name: name.trim() })
      .eq("id", environmentId);
    if (error) throw new Error(error.message);
    revalidatePath("/properties");
    return { error: null };
  });
}

export async function deleteEnvironment(environmentId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();
    const { error } = await supabase
      .from("environments")
      .delete()
      .eq("id", environmentId);
    if (error) throw new Error(error.message);
    revalidatePath("/properties");
    return { error: null };
  });
}
