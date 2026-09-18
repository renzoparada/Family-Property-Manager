"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { formatLastSeen } from "@/lib/format";
import { createIcalFeed, deleteIcalFeed, syncIcalFeed } from "@/lib/actions/ical";
import type { Environment, IcalFeed, Property } from "@/lib/types";

const PLATFORM_LABEL: Record<string, string> = {
  airbnb: "Airbnb",
  booking: "Booking",
  otro: "Otro",
};

export function IcalFeedsPanel({
  feeds,
  properties,
  environments,
}: {
  feeds: IcalFeed[];
  properties: Property[];
  environments: Environment[];
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function propertyName(id: string) {
    return properties.find((p) => p.id === id)?.name ?? "—";
  }

  function handleSync(feedId: string) {
    setError(null);
    startTransition(async () => {
      const result = await syncIcalFeed(feedId);
      if (result.error) {
        setError(result.error);
        return;
      }
      const parts: string[] = [];
      if (result.imported) parts.push(`${result.imported} nuevas`);
      if (result.updated) parts.push(`${result.updated} actualizadas`);
      if (result.cancelled) parts.push(`${result.cancelled} canceladas`);
      setSyncMessage((prev) => ({
        ...prev,
        [feedId]: parts.length ? parts.join(", ") : "Sin cambios",
      }));
    });
  }

  function handleDelete(feedId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteIcalFeed(feedId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="mb-4">
      <button className="btn-secondary text-sm" onClick={() => setOpen(true)}>
        🔗 Conectar Airbnb / Booking
      </button>

      {open && (
        <Modal title="Sincronización de calendarios (iCal)" onClose={() => setOpen(false)}>
          <p className="mb-3 text-xs text-[var(--color-muted)]">
            Airbnb y Booking no dan acceso a su API a anfitriones individuales, pero ambos
            permiten exportar un link de calendario (.ics) por anuncio con las fechas
            ocupadas. Ese link solo trae fechas — sin huésped ni precio — así que cada
            reserva importada llega como &quot;Pendiente&quot; para que completes esos datos.
          </p>

          {error && <p className="mb-3 text-sm text-[var(--color-danger)]">{error}</p>}

          <div className="space-y-2">
            {feeds.length === 0 && (
              <p className="text-sm text-[var(--color-muted)]">Aún no conectaste ningún calendario.</p>
            )}
            {feeds.map((f) => (
              <div key={f.id} className="card p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-[var(--color-ink)]">
                      {PLATFORM_LABEL[f.platform] ?? f.platform}
                    </span>{" "}
                    · {propertyName(f.property_id)}
                  </div>
                  <button
                    className="btn-ghost !px-2 text-xs text-[var(--color-danger)]"
                    disabled={pending}
                    onClick={() => handleDelete(f.id)}
                  >
                    Quitar
                  </button>
                </div>
                <div className="mt-1 truncate text-xs text-[var(--color-muted)]" title={f.url}>
                  {f.url}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--color-muted)]">
                    {f.last_synced_at
                      ? `Última sincronización: ${formatLastSeen(f.last_synced_at)}`
                      : "Nunca sincronizado"}
                    {f.last_sync_status === "error" && f.last_sync_error && (
                      <span className="text-[var(--color-danger)]"> — {f.last_sync_error}</span>
                    )}
                    {syncMessage[f.id] && (
                      <span className="text-[var(--color-success)]"> — {syncMessage[f.id]}</span>
                    )}
                  </span>
                  <button
                    className="btn-secondary !px-2 text-xs"
                    disabled={pending}
                    onClick={() => handleSync(f.id)}
                  >
                    Sincronizar ahora
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button className="btn-primary mt-4 w-full" onClick={() => setAdding(true)}>
            + Conectar calendario
          </button>
        </Modal>
      )}

      {adding && (
        <Modal title="Conectar calendario" onClose={() => setAdding(false)}>
          <AddFeedForm
            properties={properties}
            environments={environments}
            pending={pending}
            onCancel={() => setAdding(false)}
            onSubmit={(fd) => {
              setError(null);
              startTransition(async () => {
                const result = await createIcalFeed(fd);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setAdding(false);
              });
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function AddFeedForm({
  properties,
  environments,
  pending,
  onCancel,
  onSubmit,
}: {
  properties: Property[];
  environments: Environment[];
  pending: boolean;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const envsForProperty = environments.filter((e) => e.property_id === propertyId);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      <div>
        <label className="label">Plataforma</label>
        <select className="input" name="platform" defaultValue="airbnb">
          <option value="airbnb">Airbnb</option>
          <option value="booking">Booking</option>
          <option value="otro">Otro</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Propiedad</label>
          <select
            className="input"
            name="property_id"
            required
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Ambiente (opcional)</label>
          <select className="input" name="environment_id" defaultValue="">
            <option value="">—</option>
            {envsForProperty.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Link del calendario (.ics)</label>
        <input className="input" name="url" type="url" required placeholder="https://www.airbnb.com/calendar/ical/..." />
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          En Airbnb: Calendario → Disponibilidad → Sincronización de calendarios → Exportar
          calendario. En Booking: Calendario → Sincronizar calendarios → Exportar.
        </p>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn-primary flex-1" disabled={pending}>
          Conectar
        </button>
      </div>
    </form>
  );
}
