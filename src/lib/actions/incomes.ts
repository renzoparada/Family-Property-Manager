"use server";

import { revalidatePath } from "next/cache";
import { requireWriteContext, parseAmount, str, safeAction, type ActionResult } from "@/lib/actions/util";
import type { Income, PaymentMethod } from "@/lib/types";

export type CreateIncomeResult = ActionResult & { data?: Income };

async function syncTransaction(
  supabase: Awaited<ReturnType<typeof requireWriteContext>>["supabase"],
  orgId: string,
  userId: string,
  incomeId: string,
  accountId: string | null,
  amount: number,
  date: string,
  description: string | null
) {
  await supabase
    .from("transactions")
    .delete()
    .eq("source_type", "income")
    .eq("source_id", incomeId);

  if (accountId && amount > 0) {
    await supabase.from("transactions").insert({
      organization_id: orgId,
      account_id: accountId,
      date,
      amount,
      description: description ?? "Ingreso",
      source_type: "income",
      source_id: incomeId,
      created_by: userId,
    });
  }
}

export async function createIncomeCategory(name: string) {
  const { supabase, orgId } = await requireWriteContext();
  const { data, error } = await supabase
    .from("income_categories")
    .insert({ organization_id: orgId, name: name.trim() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/income");
  return data;
}

export async function createIncome(formData: FormData): Promise<CreateIncomeResult> {
  return safeAction(async () => {
    const { supabase, orgId, userId } = await requireWriteContext();

    const propertyId = str(formData.get("property_id"));
    if (!propertyId) throw new Error("Selecciona una propiedad.");
    const amount = parseAmount(formData.get("amount"));
    const date = str(formData.get("date")) ?? new Date().toISOString().slice(0, 10);
    const description = str(formData.get("description"));
    const accountId = str(formData.get("account_id"));

    const { data, error } = await supabase
      .from("incomes")
      .insert({
        organization_id: orgId,
        property_id: propertyId,
        environment_id: str(formData.get("environment_id")),
        category_id: str(formData.get("category_id")),
        date,
        amount,
        description,
        received_by: str(formData.get("received_by")),
        received_from: str(formData.get("received_from")),
        payment_method: (str(formData.get("payment_method")) ?? "caja") as PaymentMethod,
        account_id: accountId,
        notes: str(formData.get("notes")),
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await syncTransaction(supabase, orgId, userId, data.id, accountId, amount, date, description);

    revalidatePath("/income");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return { error: null, data: data as Income };
  });
}

export async function updateIncome(incomeId: string, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase, orgId, userId } = await requireWriteContext();

    const propertyId = str(formData.get("property_id"));
    if (!propertyId) throw new Error("Selecciona una propiedad.");
    const amount = parseAmount(formData.get("amount"));
    const date = str(formData.get("date")) ?? new Date().toISOString().slice(0, 10);
    const description = str(formData.get("description"));
    const accountId = str(formData.get("account_id"));

    const { error } = await supabase
      .from("incomes")
      .update({
        property_id: propertyId,
        environment_id: str(formData.get("environment_id")),
        category_id: str(formData.get("category_id")),
        date,
        amount,
        description,
        received_by: str(formData.get("received_by")),
        received_from: str(formData.get("received_from")),
        payment_method: (str(formData.get("payment_method")) ?? "caja") as PaymentMethod,
        account_id: accountId,
        notes: str(formData.get("notes")),
      })
      .eq("id", incomeId);
    if (error) throw new Error(error.message);

    await syncTransaction(supabase, orgId, userId, incomeId, accountId, amount, date, description);

    revalidatePath("/income");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return { error: null };
  });
}

export async function deleteIncome(incomeId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();
    await supabase.from("transactions").delete().eq("source_type", "income").eq("source_id", incomeId);
    const { error } = await supabase.from("incomes").delete().eq("id", incomeId);
    if (error) throw new Error(error.message);
    revalidatePath("/income");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return { error: null };
  });
}
