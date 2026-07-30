"use server";

import { revalidatePath } from "next/cache";
import { requireWriteContext, parseAmount, str } from "@/lib/actions/util";
import type { AccountType } from "@/lib/types";

export async function createAccount(formData: FormData) {
  const { supabase, orgId } = await requireWriteContext();
  const name = str(formData.get("name"));
  const type = str(formData.get("type")) as AccountType | null;
  if (!name || !type) throw new Error("Nombre y tipo son obligatorios.");

  const { error } = await supabase.from("accounts").insert({
    organization_id: orgId,
    name,
    type,
    bank_name: str(formData.get("bank_name")),
    account_number: str(formData.get("account_number")),
    opening_balance: parseAmount(formData.get("opening_balance")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/accounts");
}

export async function createManualTransaction(
  accountId: string,
  formData: FormData
) {
  const { supabase, orgId, userId } = await requireWriteContext();
  const direction = str(formData.get("direction")) === "egreso" ? -1 : 1;
  const amount = Math.abs(parseAmount(formData.get("amount"))) * direction;
  if (amount === 0) throw new Error("El monto debe ser mayor a cero.");

  const { error } = await supabase.from("transactions").insert({
    organization_id: orgId,
    account_id: accountId,
    date: str(formData.get("date")) ?? new Date().toISOString().slice(0, 10),
    amount,
    description: str(formData.get("description")),
    source_type: "manual",
    created_by: userId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}
