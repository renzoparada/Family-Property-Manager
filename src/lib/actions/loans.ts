"use server";

import { revalidatePath } from "next/cache";
import { requireWriteContext, parseAmount, str, safeAction, type ActionResult } from "@/lib/actions/util";

export async function createLoan(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase, orgId, userId } = await requireWriteContext();

    const memberId = str(formData.get("member_id"));
    const amount = parseAmount(formData.get("amount"));
    const date = str(formData.get("date")) ?? new Date().toISOString().slice(0, 10);
    if (!memberId || amount <= 0) throw new Error("Selecciona el familiar y un monto válido.");

    const { data, error } = await supabase
      .from("loans")
      .insert({
        organization_id: orgId,
        member_id: memberId,
        date,
        amount,
        description: str(formData.get("description")),
        interest_rate: parseAmount(formData.get("interest_rate")),
        status: "pendiente",
        account_id: str(formData.get("account_id")),
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const accountId = str(formData.get("account_id"));
    if (accountId) {
      await supabase.from("transactions").insert({
        organization_id: orgId,
        account_id: accountId,
        date,
        amount, // money comes into the account — the company now owes the member
        description: "Préstamo recibido de familiar",
        source_type: "loan",
        source_id: data.id,
        created_by: userId,
      });
    }

    revalidatePath("/loans");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return { error: null };
  });
}

export async function createLoanPayment(loanId: string, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase, orgId, userId } = await requireWriteContext();

    const amount = parseAmount(formData.get("amount"));
    const date = str(formData.get("date")) ?? new Date().toISOString().slice(0, 10);
    const accountId = str(formData.get("account_id"));
    if (amount <= 0) throw new Error("Ingresa un monto válido.");

    const { data: payment, error } = await supabase
      .from("loan_payments")
      .insert({
        loan_id: loanId,
        date,
        amount,
        notes: str(formData.get("notes")),
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
        amount: -amount,
        description: "Pago de préstamo familiar",
        source_type: "loan_payment",
        source_id: payment.id,
        created_by: userId,
      });
    }

    const { data: loan } = await supabase.from("loans").select("amount").eq("id", loanId).single();
    const { data: payments } = await supabase
      .from("loan_payments")
      .select("amount")
      .eq("loan_id", loanId);
    const totalPaid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
    const status = !loan
      ? "pendiente"
      : totalPaid >= Number(loan.amount)
      ? "pagado"
      : totalPaid > 0
      ? "parcial"
      : "pendiente";

    await supabase.from("loans").update({ status }).eq("id", loanId);

    revalidatePath("/loans");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return { error: null };
  });
}
