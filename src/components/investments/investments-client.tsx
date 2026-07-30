"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/format";
import { createInvestment, updateInitialShare } from "@/lib/actions/investments";
import type { Account, Investment, OrganizationMember, Property } from "@/lib/types";

export function InvestmentsClient({
  investments,
  members,
  properties,
  accounts,
  currency,
  canWrite,
  isAdmin,
}: {
  investments: Investment[];
  members: OrganizationMember[];
  properties: Property[];
  accounts: Account[];
  currency: string;
  canWrite: boolean;
  isAdmin: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalInvested = useMemo(
    () => investments.reduce((s, i) => s + Number(i.amount), 0),
    [investments]
  );

  function investedBy(memberId: string) {
    return investments
      .filter((i) => i.member_id === memberId)
      .reduce((s, i) => s + Number(i.amount), 0);
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
      <div className="card mb-6 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Socio</th>
              <th>Participación inicial</th>
              <th>Capital adicional aportado</th>
              <th>% del capital adicional total</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.profile?.full_name || m.profile?.email || "Miembro"}</td>
                <td>
                  {isAdmin ? (
                    <ShareEditor member={m} onSave={(pct) => runAction(() => updateInitialShare(m.id, pct))} />
                  ) : (
                    `${m.initial_share_percentage}%`
                  )}
                </td>
                <td>{formatCurrency(investedBy(m.id), currency)}</td>
                <td className="text-[var(--color-investment)]">
                  {totalInvested > 0 ? `${((investedBy(m.id) / totalInvested) * 100).toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)]">
          La participación inicial es la acción negociada de cada socio y solo un administrador puede editarla
          directamente. El capital adicional aportado es informativo: muestra cuánto ha invertido cada quien, sin
          alterar las acciones originales.
        </p>
      </div>

      {canWrite && (
        <div className="mb-4">
          <button className="btn-primary" onClick={() => setCreating(true)}>
            + Registrar inversión
          </button>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-[var(--color-danger)]">{error}</p>}

      {investments.length === 0 ? (
        <EmptyState
          title="Sin inversiones registradas"
          description="Registra aportes de capital como construcciones, ampliaciones o compra de muebles permanentes — distinto de un gasto operativo."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Socio</th>
                <th>Propiedad</th>
                <th>Descripción</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {investments.map((inv) => (
                <tr key={inv.id}>
                  <td>{formatDate(inv.date)}</td>
                  <td>
                    {members.find((m) => m.id === inv.member_id)?.profile?.full_name ?? "—"}
                  </td>
                  <td>{properties.find((p) => p.id === inv.property_id)?.name ?? "—"}</td>
                  <td>{inv.description}</td>
                  <td className="text-[var(--color-investment)]">
                    {formatCurrency(inv.amount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <Modal title="Registrar inversión" onClose={() => setCreating(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              runAction(() => createInvestment(fd), () => setCreating(false));
            }}
          >
            <div>
              <label className="label">Socio que invierte</label>
              <select className="input" name="member_id" required>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.profile?.full_name || m.profile?.email || "Miembro"}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha</label>
                <input className="input" type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <label className="label">Monto</label>
                <input className="input" type="number" step="0.01" name="amount" required />
              </div>
            </div>
            <div>
              <label className="label">Descripción</label>
              <input className="input" name="description" required placeholder="Construcción de piscina" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Propiedad (opcional)</label>
                <select className="input" name="property_id" defaultValue="">
                  <option value="">—</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Cuenta afectada (opcional)</label>
                <select className="input" name="account_id" defaultValue="">
                  <option value="">—</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button className="btn-primary w-full" disabled={pending}>
              Registrar
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ShareEditor({
  member,
  onSave,
}: {
  member: OrganizationMember;
  onSave: (pct: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(member.initial_share_percentage);

  if (!editing) {
    return (
      <button className="underline decoration-dotted" onClick={() => setEditing(true)}>
        {member.initial_share_percentage}%
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <input
        className="input w-20 py-1"
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
      <button
        className="text-xs font-medium text-[var(--color-accent)]"
        onClick={() => {
          onSave(value);
          setEditing(false);
        }}
      >
        OK
      </button>
    </span>
  );
}
