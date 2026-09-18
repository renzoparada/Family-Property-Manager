"use server";

import { revalidatePath } from "next/cache";
import { requireWriteContext, parseAmount, str, safeAction, type ActionResult } from "@/lib/actions/util";
import type { Reservation, ReservationPlatform, ReservationStatus } from "@/lib/types";

async function syncTransaction(
  supabase: Awaited<ReturnType<typeof requireWriteContext>>["supabase"],
  orgId: string,
  userId: string,
  reservationId: string,
  status: ReservationStatus,
  accountId: string | null,
  netAmount: number,
  depositAmount: number,
  date: string,
  guestName: string
) {
  await supabase
    .from("transactions")
    .delete()
    .eq("source_type", "reservation")
    .eq("source_id", reservationId);

  if (!accountId) return;

  const rows: {
    organization_id: string;
    account_id: string;
    date: string;
    amount: number;
    description: string;
    source_type: string;
    source_id: string;
    created_by: string;
  }[] = [];

  // The deposit is cash actually received at booking time, regardless of
  // whether the stay is fully paid yet — it posts as soon as it exists.
  if (depositAmount > 0) {
    rows.push({
      organization_id: orgId,
      account_id: accountId,
      date,
      amount: depositAmount,
      description: `Anticipo — ${guestName}`,
      source_type: "reservation",
      source_id: reservationId,
      created_by: userId,
    });
  }

  // The remaining balance only posts once the reservation is marked as
  // fully paid — until then it's a receivable, not cash in hand.
  const balance = netAmount - depositAmount;
  if (status === "pagado" && balance > 0) {
    rows.push({
      organization_id: orgId,
      account_id: accountId,
      date,
      amount: balance,
      description: `Saldo — ${guestName}`,
      source_type: "reservation",
      source_id: reservationId,
      created_by: userId,
    });
  }

  if (rows.length > 0) {
    await supabase.from("transactions").insert(rows);
  }
}

export type ReservationFormResult = ActionResult & { data?: Reservation };

export async function createReservation(formData: FormData): Promise<ReservationFormResult> {
  return safeAction(async () => {
    const { supabase, orgId, userId } = await requireWriteContext();

    const propertyId = str(formData.get("property_id"));
    const checkIn = str(formData.get("check_in"));
    const checkOut = str(formData.get("check_out"));
    const guestName = str(formData.get("guest_name"));
    if (!propertyId || !checkIn || !checkOut || !guestName) {
      throw new Error("Completa los campos obligatorios.");
    }

    const grossAmount = parseAmount(formData.get("gross_amount"));
    const commissionAmount = parseAmount(formData.get("commission_amount"));
    const depositAmount = parseAmount(formData.get("deposit_amount"));
    if (depositAmount > grossAmount) {
      throw new Error("El anticipo no puede ser mayor al monto total pactado.");
    }
    const status = (str(formData.get("status")) ?? "pendiente") as ReservationStatus;
    const accountId = str(formData.get("account_id"));

    const { data, error } = await supabase
      .from("reservations")
      .insert({
        organization_id: orgId,
        property_id: propertyId,
        environment_id: str(formData.get("environment_id")),
        check_in: checkIn,
        check_out: checkOut,
        guest_name: guestName,
        platform: (str(formData.get("platform")) ?? "directo") as ReservationPlatform,
        gross_amount: grossAmount,
        commission_amount: commissionAmount,
        deposit_amount: depositAmount,
        status,
        account_id: accountId,
        notes: str(formData.get("notes")),
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await syncTransaction(
      supabase,
      orgId,
      userId,
      data.id,
      status,
      accountId,
      grossAmount - commissionAmount,
      depositAmount,
      checkIn,
      guestName
    );

    revalidatePath("/reservations");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return { error: null, data: data as Reservation };
  });
}

export async function updateReservation(reservationId: string, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase, orgId, userId } = await requireWriteContext();

    const propertyId = str(formData.get("property_id"));
    const checkIn = str(formData.get("check_in"));
    const checkOut = str(formData.get("check_out"));
    const guestName = str(formData.get("guest_name"));
    if (!propertyId || !checkIn || !checkOut || !guestName) {
      throw new Error("Completa los campos obligatorios.");
    }

    const grossAmount = parseAmount(formData.get("gross_amount"));
    const commissionAmount = parseAmount(formData.get("commission_amount"));
    const depositAmount = parseAmount(formData.get("deposit_amount"));
    if (depositAmount > grossAmount) {
      throw new Error("El anticipo no puede ser mayor al monto total pactado.");
    }
    const status = (str(formData.get("status")) ?? "pendiente") as ReservationStatus;
    const accountId = str(formData.get("account_id"));

    const { error } = await supabase
      .from("reservations")
      .update({
        property_id: propertyId,
        environment_id: str(formData.get("environment_id")),
        check_in: checkIn,
        check_out: checkOut,
        guest_name: guestName,
        platform: (str(formData.get("platform")) ?? "directo") as ReservationPlatform,
        gross_amount: grossAmount,
        commission_amount: commissionAmount,
        deposit_amount: depositAmount,
        status,
        account_id: accountId,
        notes: str(formData.get("notes")),
      })
      .eq("id", reservationId);
    if (error) throw new Error(error.message);

    await syncTransaction(
      supabase,
      orgId,
      userId,
      reservationId,
      status,
      accountId,
      grossAmount - commissionAmount,
      depositAmount,
      checkIn,
      guestName
    );

    revalidatePath("/reservations");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return { error: null };
  });
}

export async function deleteReservation(reservationId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();
    await supabase
      .from("transactions")
      .delete()
      .eq("source_type", "reservation")
      .eq("source_id", reservationId);
    const { error } = await supabase.from("reservations").delete().eq("id", reservationId);
    if (error) throw new Error(error.message);
    revalidatePath("/reservations");
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    return { error: null };
  });
}
