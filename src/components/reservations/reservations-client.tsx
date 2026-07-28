"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { AttachmentUploader } from "@/components/ui/attachment-uploader";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAttachments } from "@/lib/use-attachments";
import {
  createReservation,
  updateReservation,
  deleteReservation,
} from "@/lib/actions/reservations";
import type {
  Account,
  Environment,
  Property,
  Reservation,
} from "@/lib/types";

const PLATFORM_LABEL: Record<string, string> = {
  airbnb: "Airbnb",
  booking: "Booking",
  google: "Google",
  directo: "Directo",
  otro: "Otro",
};

const STATUS_LABEL: Record<string, string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
  cancelado: "Cancelado",
};

export function ReservationsClient({
  reservations,
  properties,
  environments,
  accounts,
  currency,
  canWrite,
}: {
  reservations: Reservation[];
  properties: Property[];
  environments: Environment[];
  accounts: Account[];
  currency: string;
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [propertyFilter, setPropertyFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      propertyFilter
        ? reservations.filter((r) => r.property_id === propertyFilter)
        : reservations,
    [reservations, propertyFilter]
  );

  function runAction(fn: () => Promise<void>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
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
            + Nueva reserva
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
      </div>

      {error && <p className="mb-3 text-sm text-[var(--color-danger)]">{error}</p>}

      {filtered.length === 0 ? (
        <EmptyState title="Sin reservas" description="Registra tu primera reserva." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ingreso</th>
                <th>Salida</th>
                <th>Propiedad</th>
                <th>Huésped</th>
                <th>Plataforma</th>
                <th>Neto</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.check_in)}</td>
                  <td>{formatDate(r.check_out)}</td>
                  <td>{properties.find((p) => p.id === r.property_id)?.name ?? "—"}</td>
                  <td>{r.guest_name}</td>
                  <td>{PLATFORM_LABEL[r.platform]}</td>
                  <td className="text-[var(--color-income)]">
                    {formatCurrency(r.net_amount, currency)}
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>
                    {canWrite && (
                      <button className="btn-ghost !px-2 text-xs" onClick={() => setEditing(r)}>
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
        <ReservationForm
          title="Nueva reserva"
          properties={properties}
          environments={environments}
          accounts={accounts}
          onClose={() => setCreating(false)}
          onSubmit={(fd) =>
            runAction(() => createReservation(fd), () => setCreating(false))
          }
          pending={pending}
        />
      )}

      {editing && (
        <ReservationForm
          title="Editar reserva"
          properties={properties}
          environments={environments}
          accounts={accounts}
          reservation={editing}
          onClose={() => setEditing(null)}
          onSubmit={(fd) =>
            runAction(() => updateReservation(editing.id, fd), () => setEditing(null))
          }
          onDelete={
            canWrite
              ? () => runAction(() => deleteReservation(editing.id), () => setEditing(null))
              : undefined
          }
          pending={pending}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pagado: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
    pendiente: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
    cancelado: "bg-[var(--color-danger)]/15 text-[var(--color-danger)]",
  };
  return <span className={`badge ${styles[status]}`}>{STATUS_LABEL[status]}</span>;
}

function ReservationForm({
  title,
  properties,
  environments,
  accounts,
  reservation,
  onClose,
  onSubmit,
  onDelete,
  pending,
}: {
  title: string;
  properties: Property[];
  environments: Environment[];
  accounts: Account[];
  reservation?: Reservation;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  const [propertyId, setPropertyId] = useState(reservation?.property_id ?? properties[0]?.id ?? "");
  const [gross, setGross] = useState(reservation?.gross_amount ?? 0);
  const [commission, setCommission] = useState(reservation?.commission_amount ?? 0);
  const [attachments, setAttachments] = useAttachments("reservation", reservation?.id);

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
            <select className="input" name="environment_id" defaultValue={reservation?.environment_id ?? ""}>
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
            <label className="label">Fecha ingreso</label>
            <input className="input" type="date" name="check_in" required defaultValue={reservation?.check_in} />
          </div>
          <div>
            <label className="label">Fecha salida</label>
            <input className="input" type="date" name="check_out" required defaultValue={reservation?.check_out} />
          </div>
        </div>

        <div>
          <label className="label">Cliente</label>
          <input className="input" name="guest_name" required defaultValue={reservation?.guest_name} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Plataforma</label>
            <select className="input" name="platform" defaultValue={reservation?.platform ?? "directo"}>
              {Object.entries(PLATFORM_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" name="status" defaultValue={reservation?.status ?? "pendiente"}>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Monto recibido</label>
            <input
              className="input"
              name="gross_amount"
              type="number"
              step="0.01"
              value={gross}
              onChange={(e) => setGross(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Comisión</label>
            <input
              className="input"
              name="commission_amount"
              type="number"
              step="0.01"
              value={commission}
              onChange={(e) => setCommission(Number(e.target.value))}
            />
          </div>
        </div>
        <p className="text-xs text-[var(--color-muted)]">
          Monto neto: <span className="font-medium text-[var(--color-ink)]">{(gross - commission).toFixed(2)}</span>
        </p>

        <div>
          <label className="label">Cuenta destino (si está pagado)</label>
          <select className="input" name="account_id" defaultValue={reservation?.account_id ?? ""}>
            <option value="">—</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Notas</label>
          <textarea className="input" name="notes" defaultValue={reservation?.notes ?? ""} rows={2} />
        </div>

        {reservation && (
          <AttachmentUploader
            organizationId={reservation.organization_id}
            entityType="reservation"
            entityId={reservation.id}
            attachments={attachments}
            onChange={setAttachments}
          />
        )}

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
