"use server";

import { revalidatePath } from "next/cache";
import { requireWriteContext, str } from "@/lib/actions/util";

export async function createProperty(formData: FormData) {
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
}

export async function updateProperty(propertyId: string, formData: FormData) {
  const { supabase } = await requireWriteContext();
  const name = str(formData.get("name"));
  if (!name) throw new Error("El nombre es obligatorio.");

  const { error } = await supabase
    .from("properties")
    .update({ name, address: str(formData.get("address")) })
    .eq("id", propertyId);
  if (error) throw new Error(error.message);
  revalidatePath("/properties");
}

export async function archiveProperty(propertyId: string, isActive: boolean) {
  const { supabase } = await requireWriteContext();
  const { error } = await supabase
    .from("properties")
    .update({ is_active: isActive })
    .eq("id", propertyId);
  if (error) throw new Error(error.message);
  revalidatePath("/properties");
}

export async function createEnvironment(propertyId: string, formData: FormData) {
  const { supabase } = await requireWriteContext();
  const name = str(formData.get("name"));
  if (!name) throw new Error("El nombre es obligatorio.");

  const { error } = await supabase.from("environments").insert({
    property_id: propertyId,
    name,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/properties");
}

export async function renameEnvironment(environmentId: string, name: string) {
  const { supabase } = await requireWriteContext();
  if (!name.trim()) throw new Error("El nombre es obligatorio.");

  const { error } = await supabase
    .from("environments")
    .update({ name: name.trim() })
    .eq("id", environmentId);
  if (error) throw new Error(error.message);
  revalidatePath("/properties");
}

export async function deleteEnvironment(environmentId: string) {
  const { supabase } = await requireWriteContext();
  const { error } = await supabase
    .from("environments")
    .delete()
    .eq("id", environmentId);
  if (error) throw new Error(error.message);
  revalidatePath("/properties");
}
