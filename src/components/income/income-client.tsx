"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { AttachmentUploader } from "@/components/ui/attachment-uploader";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAttachments } from "@/lib/use-attachments";
import {
  createIncome,
  updateIncome,
  deleteIncome,
  createIncomeCategory,
  type CreateIncomeResult,
} from "@/lib/actions/incomes";
import type {
  Account,
  Environment,
  Income,
  IncomeCategory,
  OrganizationMember,
  Property,
} from "@/lib/types";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  caja: "Caja",
  banco: "Banco",
  transferencia: "Transferencia",
  qr: "QR",
  tarjeta: "Tarjeta",
};

export function IncomeClient({
  incomes,
  properties,
  environments,
  accounts,
  categories,
  members,
  attachmentCounts,
  currency,
  canWrite,
}: {
  incomes: Income[];
  properties: Property[];
  environments: Environment[];
  accounts: Account[];
  categories: IncomeCategory[];
  members: OrganizationMember[];
  attachmentCounts: Record<string, number>;
  currency: string;
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [propertyFilter, setPropertyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoryList, setCategoryList] = useState(categories);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      incomes.filter(
        (i) =>
          (!propertyFilter || i.property_id === propertyFilter) &&
          (!categoryFilter || i.category_id === categoryFilter)
      ),
    [incomes, propertyFilter, categoryFilter]
  );

  const total = useMemo(() => filtered.reduce((s, i) => s + Number(i.amount), 0), [filtered]);

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

  function categoryName(id: string | null) {
    return categoryList.find((c) => c.id === id)?.name ?? "Sin categoría";
  }

  // Reopens the newly-created income in edit mode so a comprobante can be
  // attached right away — AttachmentUploader needs a real entity id, which
  // doesn't exist until the record is saved.
  function handleCreateSubmit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result: CreateIncomeResult = await createIncome(fd);
        if (result.error) {
          setError(result.error);
          return;
        }
        setCreating(false);
        if (result.data) setEditing(result.data);
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
            + Nuevo ingreso
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
        <select className="input !w-auto" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categoryList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-[var(--color-muted)]">
          Total: <span className="font-semibold text-[var(--color-income)]">{formatCurrency(total, currency)}</span>
        </span>
      </div>

      {error && <p className="mb-3 text-sm text-[var(--color-danger)]">{error}</p>}

      {filtered.length === 0 ? (
        <EmptyState title="Sin ingresos" description="Registra tu primer ingreso (ventas, entradas, etc.)." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Propiedad</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Método</th>
                <th>Monto</th>
                <th>Adjuntos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td>{formatDate(i.date)}</td>
                  <td>{properties.find((p) => p.id === i.property_id)?.name ?? "—"}</td>
                  <td>{categoryName(i.category_id)}</td>
                  <td className="max-w-[220px] truncate">{i.description}</td>
                  <td>{PAYMENT_METHOD_LABEL[i.payment_method]}</td>
                  <td className="text-[var(--color-income)]">{formatCurrency(i.amount, currency)}</td>
                  <td>
                    {attachmentCounts[i.id] ? (
                      <button
                        className="badge bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                        onClick={() => setEditing(i)}
                        title="Ver adjuntos"
                      >
                        {attachmentCounts[i.id]} adjunto{attachmentCounts[i.id] > 1 ? "s" : ""}
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">—</span>
                    )}
                  </td>
                  <td>
                    {canWrite && (
                      <button className="btn-ghost !px-2 text-xs" onClick={() => setEditing(i)}>
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
        <IncomeForm
          title="Nuevo ingreso"
          properties={properties}
          environments={environments}
          accounts={accounts}
          categories={categoryList}
          members={members}
          onAddCategory={async (name) => {
            const cat = await createIncomeCategory(name);
            if (cat) setCategoryList((prev) => [...prev, cat as IncomeCategory]);
            return cat as IncomeCategory;
          }}
          onClose={() => setCreating(false)}
          onSubmit={handleCreateSubmit}
          pending={pending}
        />
      )}

      {editing && (
        <IncomeForm
          title="Editar ingreso"
          properties={properties}
          environments={environments}
          accounts={accounts}
          categories={categoryList}
          members={members}
          income={editing}
          onAddCategory={async (name) => {
            const cat = await createIncomeCategory(name);
            if (cat) setCategoryList((prev) => [...prev, cat as IncomeCategory]);
            return cat as IncomeCategory;
          }}
          onClose={() => setEditing(null)}
          onSubmit={(fd) => runAction(() => updateIncome(editing.id, fd), () => setEditing(null))}
          onDelete={canWrite ? () => runAction(() => deleteIncome(editing.id), () => setEditing(null)) : undefined}
          pending={pending}
        />
      )}
    </div>
  );
}

function IncomeForm({
  title,
  properties,
  environments,
  accounts,
  categories,
  members,
  income,
  onAddCategory,
  onClose,
  onSubmit,
  onDelete,
  pending,
}: {
  title: string;
  properties: Property[];
  environments: Environment[];
  accounts: Account[];
  categories: IncomeCategory[];
  members: OrganizationMember[];
  income?: Income;
  onAddCategory: (name: string) => Promise<IncomeCategory>;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  const [propertyId, setPropertyId] = useState(income?.property_id ?? properties[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(income?.category_id ?? "");
  const [attachments, setAttachments] = useAttachments("income", income?.id);
  const envsForProperty = environments.filter((e) => e.property_id === propertyId);

  async function handleNewCategory() {
    const name = window.prompt("Nombre de la nueva categoría");
    if (!name) return;
    const cat = await onAddCategory(name);
    if (cat) setCategoryId(cat.id);
  }

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
            <label className="label">Fecha</label>
            <input
              className="input"
              type="date"
              name="date"
              required
              defaultValue={income?.date ?? new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div>
            <label className="label">Monto</label>
            <input className="input" type="number" step="0.01" name="amount" required defaultValue={income?.amount} />
          </div>
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
            <select className="input" name="environment_id" defaultValue={income?.environment_id ?? ""}>
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
          <label className="label">Categoría</label>
          <div className="flex gap-2">
            <select
              className="input"
              name="category_id"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn-secondary text-xs" onClick={handleNewCategory}>
              + Categoría
            </button>
          </div>
        </div>

        <div>
          <label className="label">Descripción</label>
          <input className="input" name="description" defaultValue={income?.description ?? ""} placeholder="Ej. Venta de entradas del sábado" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Quién cobró</label>
            <select className="input" name="received_by" defaultValue={income?.received_by ?? ""}>
              <option value="">—</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name || m.profile?.email || "Miembro"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">De quién se recibió</label>
            <input className="input" name="received_from" defaultValue={income?.received_from ?? ""} placeholder="Ej. Visitante, Tienda" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Método de pago</label>
            <select className="input" name="payment_method" defaultValue={income?.payment_method ?? "caja"}>
              {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cuenta (afecta saldo)</label>
            <select
              className="input"
              name="account_id"
              defaultValue={income?.account_id ?? (accounts.length === 1 ? accounts[0].id : "")}
            >
              <option value="">— (no se acredita a ninguna cuenta)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Si dejas esto en “—”, el ingreso no se sumará al saldo de Caja y bancos.
            </p>
          </div>
        </div>

        <div>
          <label className="label">Notas</label>
          <textarea className="input" name="notes" rows={2} defaultValue={income?.notes ?? ""} />
        </div>

        {income && (
          <AttachmentUploader
            organizationId={income.organization_id}
            entityType="income"
            entityId={income.id}
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
