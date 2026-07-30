"use server";

import { revalidatePath } from "next/cache";
import { requireWriteContext, parseAmount, str, safeAction, type ActionResult } from "@/lib/actions/util";
import type { PaymentMethod } from "@/lib/types";

async function syncTransaction(
  supabase: Awaited<ReturnType<typeof requireWriteContext>>["supabase"],
  orgId: string,
  userId: string,
  expenseId: string,
  accountId: string | null,
  amount: number,
  date: string,
  description: string | null
) {
  await supabase
    .from("transactions")
    .delete()
    .eq("source_type", "expense")
    .eq("source_id", expenseId);

  if (accountId && amount > 0) {
    await supabase.from("transactions").insert({
      organization_id: orgId,
      account_id: accountId,
      date,
      amount: -amount,
      description: description ?? "Gasto",
      source_type: "expense",
      source_id: expenseId,
      created_by: userId,
    });
  }
}

export async function createExpenseCategory(name: string) {
  const { supabase, orgId } = await requireWriteContext();
  const { data, error } = await supabase
    .from("expense_categories")
    .insert({ organization_id: orgId, name: name.trim() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/expenses");
  return data;
}

export async function createExpense(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase, orgId, userId } = await requireWriteContext();

    const propertyId = str(formData.get("property_id"));
    if (!propertyId) throw new Error("Selecciona una propiedad.");
    const amount = parseAmount(formData.get("amount"));
    const date = str(formData.get("date")) ?? new Date().toISOString().slice(0, 10);
    const description = str(formData.get("description"));
    const accountId = str(formData.get("account_id"));

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        organization_id: orgId,
        property_id: propertyId,
        environment_id: str(formData.get("environment_id")),
        category_id: str(formData.get("category_id")),
        date,
        amount,
        description,
        paid_by: str(formData.get("paid_by")),
        paid_to: str(formData.get("paid_to")),
        payment_method: (str(formData.get("payment_method")) ?? "caja") as PaymentMethod,
        account_id: accountId,
        notes: str(formData.get("notes")),
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await syncTransaction(supabase, orgId, userId, data.id, accountId, amount, date, description);

    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return { error: null };
  });
}

export async function updateExpense(expenseId: string, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase, orgId, userId } = await requireWriteContext();

    const propertyId = str(formData.get("property_id"));
    if (!propertyId) throw new Error("Selecciona una propiedad.");
    const amount = parseAmount(formData.get("amount"));
    const date = str(formData.get("date")) ?? new Date().toISOString().slice(0, 10);
    const description = str(formData.get("description"));
    const accountId = str(formData.get("account_id"));

    const { error } = await supabase
      .from("expenses")
      .update({
        property_id: propertyId,
        environment_id: str(formData.get("environment_id")),
        category_id: str(formData.get("category_id")),
        date,
        amount,
        description,
        paid_by: str(formData.get("paid_by")),
        paid_to: str(formData.get("paid_to")),
        payment_method: (str(formData.get("payment_method")) ?? "caja") as PaymentMethod,
        account_id: accountId,
        notes: str(formData.get("notes")),
      })
      .eq("id", expenseId);
    if (error) throw new Error(error.message);

    await syncTransaction(supabase, orgId, userId, expenseId, accountId, amount, date, description);

    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return { error: null };
  });
}

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();
    await supabase.from("transactions").delete().eq("source_type", "expense").eq("source_id", expenseId);
    const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
    if (error) throw new Error(error.message);
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return { error: null };
  });
}
