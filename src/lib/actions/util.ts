import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";

export class ActionError extends Error {}

/** Resolves the caller's active organization + write permission, or throws. */
export async function requireWriteContext() {
  const session = await getSessionContext();
  if (!session) throw new ActionError("No autenticado.");
  if (!session.activeOrgId) throw new ActionError("Sin organización activa.");
  if (
    session.activeRole !== "admin" &&
    session.activeRole !== "socio" &&
    session.activeRole !== "contador"
  ) {
    throw new ActionError("No tienes permisos para modificar datos.");
  }
  const supabase = await createClient();
  return { supabase, orgId: session.activeOrgId, userId: session.userId, role: session.activeRole };
}

export async function requireAdminContext() {
  const ctx = await requireWriteContext();
  if (ctx.role !== "admin") throw new ActionError("Solo un administrador puede hacer esto.");
  return ctx;
}

export function parseAmount(value: FormDataEntryValue | null): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function str(value: FormDataEntryValue | null): string | null {
  const s = (value ?? "").toString().trim();
  return s.length ? s : null;
}
