"use client";

import { useMemo, useState, useTransition } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { AssetForm } from "@/components/assets/asset-form";
import { formatCurrency, formatDate } from "@/lib/format";
import { createAsset, updateAsset, deleteAsset } from "@/lib/actions/assets";
import type { Asset, Environment, Property } from "@/lib/types";

export function AssetsClient({
  assets,
  properties,
  environments,
  currency,
  canWrite,
}: {
  assets: Asset[];
  properties: Property[];
  environments: Environment[];
  currency: string;
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [propertyFilter, setPropertyFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () => (propertyFilter ? assets.filter((a) => a.property_id === propertyFilter) : assets),
    [assets, propertyFilter]
  );

  const totalValue = useMemo(
    () => filtered.reduce((s, a) => s + Number(a.cost) * a.quantity, 0),
    [filtered]
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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {canWrite && (
          <button className="btn-primary" onClick={() => setCreating(true)}>
            + Nuevo activo
          </button>
        )}
        <select className="input !w-auto" value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}>
          <option value="">Todas las propiedades</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="text-sm text-[var(--color-muted)]">
          {filtered.length} ítems · Valor total: <span className="font-medium text-[var(--color-ink)]">{formatCurrency(totalValue, currency)}</span>
        </span>
      </div>

      {error && <p className="mb-3 text-sm text-[var(--color-danger)]">{error}</p>}

      {filtered.length === 0 ? (
        <EmptyState title="Sin activos fijos" description="Registra muebles, equipos o herramientas ya comprados." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Detalle</th>
                <th>Propiedad</th>
                <th>Cant.</th>
                <th>Costo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>{formatDate(a.acquired_date)}</td>
                  <td>
                    {a.detail}
                    {a.source_need_id && (
                      <span className="ml-1 text-xs text-[var(--color-muted)]" title="Convertido desde Necesidades">
                        📋
                      </span>
                    )}
                  </td>
                  <td>{propertyName(a.property_id)}</td>
                  <td>{a.quantity}</td>
                  <td>{formatCurrency(Number(a.cost) * a.quantity, currency)}</td>
                  <td>
                    {canWrite && (
                      <button className="btn-ghost !px-2 text-xs" onClick={() => setEditing(a)}>
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <AssetForm
          title="Nuevo activo fijo"
          properties={properties}
          environments={environments}
          onClose={() => setCreating(false)}
          onSubmit={(fd) => runAction(() => createAsset(fd), () => setCreating(false))}
          pending={pending}
        />
      )}

      {editing && (
        <AssetForm
          title="Editar activo fijo"
          properties={properties}
          environments={environments}
          asset={editing}
          onClose={() => setEditing(null)}
          onSubmit={(fd) => runAction(() => updateAsset(editing.id, fd), () => setEditing(null))}
          onDelete={() => runAction(() => deleteAsset(editing.id), () => setEditing(null))}
          pending={pending}
        />
      )}
    </div>
  );
}
