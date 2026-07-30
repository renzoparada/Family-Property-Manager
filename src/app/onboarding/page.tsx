"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setActiveOrgCookie } from "@/lib/active-org";

export default function OnboardingPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        full_name:
          (user.user_metadata?.full_name as string | undefined) ?? null,
      });
    }

    const { data: orgId, error } = await supabase.rpc("fn_create_organization", {
      p_org_name: orgName,
      p_property_name: propertyName || null,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setActiveOrgCookie(orgId as string);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">
            Crea tu espacio familiar
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Un espacio privado donde tu familia administra sus propiedades.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-3 p-6">
          <div>
            <label className="label">Nombre de la familia / sociedad</label>
            <input
              className="input"
              placeholder="Ej. Familia Paradá"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Primera propiedad (opcional)</label>
            <input
              className="input"
              placeholder="Ej. Casa Playa"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creando…" : "Empezar"}
          </button>
        </form>
      </div>
    </div>
  );
}
