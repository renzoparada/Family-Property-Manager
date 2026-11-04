"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { AssetForm } from "@/components/assets/asset-form";
import { formatCurrency, formatDate } from "@/lib/format";
import { createNeed, updateNeed, deleteNeed, setNeedStatus } from "@/lib/actions/needs";
import { createAsset } from "@/lib/actions/assets";
import type { Environment, Need, NeedPriority, NeedStatus, Property } from "@/lib/types";

const PRIORITY_LABEL: Record<NeedPriority, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

const PRIORITY_STYLE: Record<NeedPriority, string> = {
  alta: "bg-[var(--color-danger)]/15 text-[var(--color-danger)]",
  media: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  baja: "bg-[var(--color-muted)]/15 text-[var(--color-muted)]",
};

export function NeedsClient({
  needs,
  properties,
  environments,
  convertedNeedIds,
  currency,
  canWrite,
}: {
  needs: Need[];
  properties: Property[];
  environments: Environment[];
  convertedNeedIds: string[];
  currency: string;
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Need | null>(null);
  const [converting, setConverting] = useState<Need | null>(null);
  const [propertyFilter, setPropertyFilter] = useState("");
  const [showPurchased, setShowPurchased] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const convertedSet = useMemo(() => new Set(convertedNeedIds), [convertedNeedIds]);

  const filtered = useMemo(
    () =>
      needs.filter((n) => {
        if (propertyFilter && n.property_id !== propertyFilter) return false;
        if (!showPurchased && n.status !== "pendiente") return false;
        return true;
      }),
    [needs, propertyFilter, showPurchased]
  );

  function propertyName(id: string) {
    return properties.find((p) => p.id === id)?.name ?? "—";
  }

  function runAction(fn: () => Promise<{ error: string | null }>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await fn();
        if (result.error) {
          setError(result.error);
          return;
        }
        onDone?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      }
    });
  }

  function toggleStatus(n: Need) {
    const next: NeedStatus = n.status === "comprado" ? "pendiente" : "comprado";
    runAction(() => setNeedStatus(n.id, next));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {canWrite && (
          <button className="btn-primary" onClick={() => setCreating(true)}>
            + Nueva necesidad
          </button>
        )}
        <select
          className="input !w-auto"
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
        >
          <option value="">Todas las propiedades</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <input
            type="checkbox"
            checked={showPurchased}
            onChange={(e) => setShowPurchased(e.target.checked)}
          />
          Mostrar compradas / descartadas
        </label>
      </div>

      {error && <p className="mb-3 text-sm text-[var(--color-danger)]">{error}</p>}

      {filtered.length === 0 ? (
        <EmptyState
          title="Sin pendientes"
          description="Registra lo que falta comprar o resolver en cada propiedad."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div key={n.id} className="card flex items-start gap-3 p-3">
              {canWrite && (
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={n.status === "comprado"}
                  disabled={pending}
                  onChange={() => toggleStatus(n)}
                />
              )}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`font-medium ${
                      n.status === "comprado" ? "text-[var(--color-muted)] line-through" : "text-[var(--color-ink)]"
                    }`}
                  >
                    {n.title}
                  </span>
                  <span className={`badge ${PRIORITY_STYLE[n.priority]}`}>{PRIORITY_LABEL[n.priority]}</span>
                  {n.status === "descartado" && <span className="badge bg-[var(--color-muted)]/15 text-[var(--color-muted)]">Descartado</span>}
                </div>
                <div className="mt-1 text-xs text-[var(--color-muted)]">
                  {propertyName(n.property_id)}
                  {n.estimated_cost != null && ` · Estimado: ${formatCurrency(n.estimated_cost, currency)}`}
                  {n.purchased_at && ` · Comprado el ${formatDate(n.purchased_at)}`}
                </div>
                {n.notes && <div className="mt-1 text-sm text-[var(--color-ink)]">{n.notes}</div>}
              </div>
              {canWrite && n.status === "comprado" && (
                convertedSet.has(n.id) ? (
                  <span className="text-xs text-[var(--color-success)]" title="Ya está en Activos fijos">
                    ✓ En Activos
                  </span>
                ) : (
                  <button className="btn-secondary !px-2 text-xs" onClick={() => setConverting(n)}>
                    + Activo fijo
                  </button>
                )
              )}
              {canWrite && (
                <button className="btn-ghost !px-2 text-xs" onClick={() => setEditing(n)}>
                  Editar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {creating && (
        <NeedForm
          title="Nueva necesidad"
          properties={properties}
          environments={environments}
          onClose={() => setCreating(false)}
          onSubmit={(fd) => runAction(() => createNeed(fd), () => setCreating(false))}
          pending={pending}
        />
      )}

      {editing && (
        <NeedForm
          title="Editar necesidad"
          properties={properties}
          environments={environments}
          need={editing}
          onClose={() => setEditing(null)}
          onSubmit={(fd) => runAction(() => updateNeed(editing.id, fd), () => setEditing(null))}
          onDelete={() => runAction(() => deleteNeed(editing.id), () => setEditing(null))}
          pending={pending}
        />
      )}

      {converting && (
        <AssetForm
          title="Agregar a Activos fijos"
          properties={properties}
          environments={environments}
          prefill={{
            property_id: converting.property_id,
            environment_id: converting.environment_id,
            detail: converting.title,
            acquired_date: converting.purchased_at,
            cost: converting.estimated_cost,
            source_need_id: converting.id,
          }}
          onClose={() => setConverting(null)}
          onSubmit={(fd) => runAction(() => createAsset(fd), () => setConverting(null))}
          pending={pending}
        />
      )}
    </div>
  );
}

function NeedForm({
  title,
  properties,
  environments,
  need,
  onClose,
  onSubmit,
  onDelete,
  pending,
}: {
  title: string;
  properties: Property[];
  environments: Environment[];
  need?: Need;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  const [propertyId, setPropertyId] = useState(need?.property_id ?? properties[0]?.id ?? "");
  const envsForProperty = environments.filter((e) => e.property_id === propertyId);

  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(new FormData(e.currentTarget));
        }}
      >
        <div>
          <label className="label">¿Qué se necesita?</label>
          <input className="input" name="title" required defaultValue={need?.title ?? ""} placeholder="Ej. Comprar sommier para habitación 2" />
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
            <select className="input" name="environment_id" defaultValue={need?.environment_id ?? ""}>
              <option value="">—</option>
              {envsForProperty.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Costo estimado (opcional)</label>
            <input className="input" name="estimated_cost" type="number" step="0.01" defaultValue={need?.estimated_cost ?? ""} />
          </div>
          <div>
            <label className="label">Prioridad</label>
            <select className="input" name="priority" defaultValue={need?.priority ?? "media"}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Notas</label>
          <textarea className="input" name="notes" rows={2} defaultValue={need?.notes ?? ""} />
        </div>

        <p className="text-xs text-[var(--color-muted)]">
          Esto es solo un pendiente — no mueve dinero. Cuando lo compres, márcalo aquí y regístralo aparte como
          Gasto con el monto y la cuenta real.
        </p>

        <div className="flex gap-2 pt-1">
          <button className="btn-primary flex-1" disabled={pending}>
            Guardar
          </button>
          {onDelete && (
            <button type="button" className="btn-secondary text-[var(--color-danger)]" onClick={onDelete} disabled={pending}>
              Eliminar
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
