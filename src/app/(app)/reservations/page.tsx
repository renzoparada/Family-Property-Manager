import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, canWrite } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { ReservationsClient } from "@/components/reservations/reservations-client";
import type { Account, Environment, Property, Reservation } from "@/lib/types";

export default async function ReservationsPage() {
  const session = await getSessionContext();
  if (!session?.activeOrgId) redirect("/login");

  const supabase = await createClient();
  const [{ data: reservations }, { data: properties }, { data: environments }, { data: accounts }, { data: org }] =
    await Promise.all([
      supabase
        .from("reservations")
        .select("*")
        .eq("organization_id", session.activeOrgId)
        .order("check_in", { ascending: false }),
      supabase
        .from("properties")
        .select("*")
        .eq("organization_id", session.activeOrgId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("environments")
        .select("*, property:properties!inner(organization_id)")
        .eq("property.organization_id", session.activeOrgId),
      supabase
        .from("accounts")
        .select("*")
        .eq("organization_id", session.activeOrgId)
        .eq("is_active", true),
      supabase.from("organizations").select("*").eq("id", session.activeOrgId).single(),
    ]);

  return (
    <div>
      <PageHeader
        title="Reservas"
        description="Registro de reservas por Airbnb, Booking, Google o directas."
      />
      <ReservationsClient
        reservations={(reservations ?? []) as Reservation[]}
        properties={(properties ?? []) as Property[]}
        environments={(environments ?? []) as unknown as Environment[]}
        accounts={(accounts ?? []) as Account[]}
        currency={org?.currency ?? "BOB"}
        canWrite={canWrite(session.activeRole)}
      />
    </div>
  );
}
