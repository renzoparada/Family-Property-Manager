"use server";

import { revalidatePath } from "next/cache";
import { requireWriteContext, str, safeAction, type ActionResult } from "@/lib/actions/util";
import { fetchIcs, parseIcs, isRealBookingEvent } from "@/lib/ical";
import type { ReservationPlatform } from "@/lib/types";

export async function createIcalFeed(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase, orgId, userId } = await requireWriteContext();

    const propertyId = str(formData.get("property_id"));
    const url = str(formData.get("url"));
    if (!propertyId || !url) throw new Error("Completa la propiedad y el link del calendario.");

    const { error } = await supabase.from("ical_feeds").insert({
      organization_id: orgId,
      property_id: propertyId,
      environment_id: str(formData.get("environment_id")),
      platform: (str(formData.get("platform")) ?? "airbnb") as ReservationPlatform,
      url,
      created_by: userId,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/reservations");
    return { error: null };
  });
}

export async function deleteIcalFeed(feedId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();
    const { error } = await supabase.from("ical_feeds").delete().eq("id", feedId);
    if (error) throw new Error(error.message);
    revalidatePath("/reservations");
    return { error: null };
  });
}

export type SyncIcalFeedResult = ActionResult & {
  imported?: number;
  updated?: number;
  cancelled?: number;
};

export async function syncIcalFeed(feedId: string): Promise<SyncIcalFeedResult> {
  return safeAction(async () => {
    const { supabase, orgId, userId } = await requireWriteContext();

    const { data: feed, error: feedError } = await supabase
      .from("ical_feeds")
      .select("*")
      .eq("id", feedId)
      .single();
    if (feedError || !feed) throw new Error("No se encontró el calendario.");

    let events;
    try {
      const text = await fetchIcs(feed.url);
      events = parseIcs(text).filter((e) => isRealBookingEvent(e.summary));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error descargando el calendario.";
      await supabase
        .from("ical_feeds")
        .update({
          last_synced_at: new Date().toISOString(),
          last_sync_status: "error",
          last_sync_error: message,
        })
        .eq("id", feedId);
      throw new Error(message);
    }

    let imported = 0;
    let updated = 0;
    let cancelled = 0;

    for (const event of events) {
      if (event.end <= event.start) continue; // malformed / zero-night entry

      const { data: existing } = await supabase
        .from("reservations")
        .select("id, check_in, check_out, status")
        .eq("ical_feed_id", feedId)
        .eq("external_uid", event.uid)
        .maybeSingle();

      if (existing) {
        const changed =
          existing.check_in !== event.start ||
          existing.check_out !== event.end ||
          existing.status === "cancelado";
        if (changed) {
          await supabase
            .from("reservations")
            .update({
              check_in: event.start,
              check_out: event.end,
              status: existing.status === "cancelado" ? "pendiente" : existing.status,
            })
            .eq("id", existing.id);
          updated++;
        }
      } else {
        await supabase.from("reservations").insert({
          organization_id: orgId,
          property_id: feed.property_id,
          environment_id: feed.environment_id,
          check_in: event.start,
          check_out: event.end,
          guest_name: `Por confirmar (${feed.platform === "booking" ? "Booking" : "Airbnb"})`,
          platform: feed.platform,
          status: "pendiente",
          ical_feed_id: feedId,
          external_uid: event.uid,
          created_by: userId,
        });
        imported++;
      }
    }

    // A UID that was imported before but is missing from this fetch means
    // the stay was cancelled or unblocked on the platform's side.
    const currentUids = new Set(events.map((e) => e.uid));
    const { data: previouslyImported } = await supabase
      .from("reservations")
      .select("id, external_uid, status")
      .eq("ical_feed_id", feedId)
      .not("external_uid", "is", null);
    for (const r of previouslyImported ?? []) {
      if (r.external_uid && !currentUids.has(r.external_uid) && r.status !== "cancelado") {
        await supabase.from("reservations").update({ status: "cancelado" }).eq("id", r.id);
        cancelled++;
      }
    }

    await supabase
      .from("ical_feeds")
      .update({ last_synced_at: new Date().toISOString(), last_sync_status: "ok", last_sync_error: null })
      .eq("id", feedId);

    revalidatePath("/reservations");
    revalidatePath("/dashboard");
    return { error: null, imported, updated, cancelled };
  });
}
