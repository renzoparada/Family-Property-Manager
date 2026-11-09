"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { Asset, Environment, Property } from "@/lib/types";

export interface AssetPrefill {
  property_id: string;
  environment_id?: string | null;
  detail: string;
  acquired_date?: string | null;
  cost?: number | null;
  source_need_id?: string | null;
  source_expense_id?: string | null;
}

export function AssetForm({
  title,
  properties,
  environments,
  asset,
  prefill,
  onClose,
  onSubmit,
  onDelete,
  pending,
}: {
  title: string;
  properties: Property[];
  environments: Environment[];
  asset?: Asset;
  prefill?: AssetPrefill;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  const base = asset ?? prefill;
  const [propertyId, setPropertyId] = useState(base?.property_id ?? properties[0]?.id ?? "");
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
        {prefill?.source_need_id && (
          <input type="hidden" name="source_need_id" value={prefill.source_need_id} />
        )}
        {prefill?.source_expense_id && (
          <input type="hidden" name="source_expense_id" value={prefill.source_expense_id} />
        )}

        <div>
          <label className="label">Detalle</label>
          <input
            className="input"
            name="detail"
            required
            defaultValue={asset?.detail ?? prefill?.detail ?? ""}
            placeholder="Ej. Freezer 300L"
          />
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
            <select
              className="input"
              name="environment_id"
              defaultValue={asset?.environment_id ?? prefill?.environment_id ?? ""}
            >
              <option value="">—</option>
              {envsForProperty.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Fecha de adquisición</label>
            <input
              className="input"
              type="date"
              name="acquired_date"
              required
              defaultValue={asset?.acquired_date ?? prefill?.acquired_date ?? new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div>
            <label className="label">Costo</label>
            <input
              className="input"
              type="number"
              step="0.01"
              name="cost"
              defaultValue={asset?.cost ?? prefill?.cost ?? ""}
            />
          </div>
          <div>
            <label className="label">Cantidad</label>
            <input className="input" type="number" min={1} step="1" name="quantity" defaultValue={asset?.quantity ?? 1} />
          </div>
        </div>

        <div>
          <label className="label">Notas</label>
          <textarea className="input" name="notes" rows={2} defaultValue={asset?.notes ?? ""} />
        </div>

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
