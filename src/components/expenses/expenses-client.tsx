"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { AttachmentUploader } from "@/components/ui/attachment-uploader";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAttachments } from "@/lib/use-attachments";
import {
  createExpense,
  updateExpense,
  deleteExpense,
  createExpenseCategory,
} from "@/lib/actions/expenses";
import type {
  Account,
  Environment,
  Expense,
  ExpenseCategory,
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

export function ExpensesClient({
  expenses,
  properties,
  environments,
  accounts,
  categories,
  members,
  attachmentCounts,
  currency,
  canWrite,
}: {
  expenses: Expense[];
  properties: Property[];
  environments: Environment[];
  accounts: Account[];
  categories: ExpenseCategory[];
  members: OrganizationMember[];
  attachmentCounts: Record<string, number>;
  currency: string;
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [propertyFilter, setPropertyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoryList, setCategoryList] = useState(categories);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      expenses.filter(
        (e) =>
          (!propertyFilter || e.property_id === propertyFilter) &&
          (!categoryFilter || e.category_id === categoryFilter)
      ),
    [expenses, propertyFilter, categoryFilter]
  );

  const total = useMemo(() => filtered.reduce((s, e) => s + Number(e.amount), 0), [filtered]);

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

  // Reopens the newly-created expense in edit mode so attachments can be
  // added right away — AttachmentUploader needs a real entity id, which
  // doesn't exist until the record is saved.
  function handleCreateSubmit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createExpense(fd);
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
            + Nuevo gasto
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
          Total: <span className="font-semibold text-[var(--color-expense)]">{formatCurrency(total, currency)}</span>
        </span>
      </div>

      {error && <p className="mb-3 text-sm text-[var(--color-danger)]">{error}</p>}

      {filtered.length === 0 ? (
        <EmptyState title="Sin gastos" description="Registra tu primer gasto." />
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
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>{formatDate(e.date)}</td>
                  <td>{properties.find((p) => p.id === e.property_id)?.name ?? "—"}</td>
                  <td>{categoryName(e.category_id)}</td>
                  <td className="max-w-[220px] truncate">{e.description}</td>
                  <td>{PAYMENT_METHOD_LABEL[e.payment_method]}</td>
                  <td className="text-[var(--color-expense)]">{formatCurrency(e.amount, currency)}</td>
                  <td>
                    {attachmentCounts[e.id] ? (
                      <button
                        className="badge bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                        onClick={() => setEditing(e)}
                        title="Ver adjuntos"
                      >
                        {attachmentCounts[e.id]} adjunto{attachmentCounts[e.id] > 1 ? "s" : ""}
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">—</span>
                    )}
                  </td>
                  <td>
                    {canWrite && (
                      <button className="btn-ghost !px-2 text-xs" onClick={() => setEditing(e)}>
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
        <ExpenseForm
          title="Nuevo gasto"
          properties={properties}
          environments={environments}
          accounts={accounts}
          categories={categoryList}
          members={members}
          onAddCategory={async (name) => {
            const cat = await createExpenseCategory(name);
            if (cat) setCategoryList((prev) => [...prev, cat as ExpenseCategory]);
            return cat as ExpenseCategory;
          }}
          onClose={() => setCreating(false)}
          onSubmit={handleCreateSubmit}
          pending={pending}
        />
      )}

      {editing && (
        <ExpenseForm
          title="Editar gasto"
          properties={properties}
          environments={environments}
          accounts={accounts}
          categories={categoryList}
          members={members}
          expense={editing}
          onAddCategory={async (name) => {
            const cat = await createExpenseCategory(name);
            if (cat) setCategoryList((prev) => [...prev, cat as ExpenseCategory]);
            return cat as ExpenseCategory;
          }}
          onClose={() => setEditing(null)}
          onSubmit={(fd) => runAction(() => updateExpense(editing.id, fd), () => setEditing(null))}
          onDelete={canWrite ? () => runAction(() => deleteExpense(editing.id), () => setEditing(null)) : undefined}
          pending={pending}
        />
      )}
    </div>
  );
}

function ExpenseForm({
  title,
  properties,
  environments,
  accounts,
  categories,
  members,
  expense,
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
  categories: ExpenseCategory[];
  members: OrganizationMember[];
  expense?: Expense;
  onAddCategory: (name: string) => Promise<ExpenseCategory>;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  const [propertyId, setPropertyId] = useState(expense?.property_id ?? properties[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(expense?.category_id ?? "");
  const [attachments, setAttachments] = useAttachments("expense", expense?.id);
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
              defaultValue={expense?.date ?? new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div>
            <label className="label">Monto</label>
            <input className="input" type="number" step="0.01" name="amount" required defaultValue={expense?.amount} />
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
            <select className="input" name="environment_id" defaultValue={expense?.environment_id ?? ""}>
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
          <input className="input" name="description" defaultValue={expense?.description ?? ""} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Quién pagó</label>
            <select className="input" name="paid_by" defaultValue={expense?.paid_by ?? ""}>
              <option value="">—</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name || m.profile?.email || "Miembro"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">A quién se pagó</label>
            <input className="input" name="paid_to" defaultValue={expense?.paid_to ?? ""} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Método de pago</label>
            <select className="input" name="payment_method" defaultValue={expense?.payment_method ?? "caja"}>
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
              defaultValue={
                expense?.account_id ?? (accounts.length === 1 ? accounts[0].id : "")
              }
            >
              <option value="">— (no descuenta de ninguna cuenta)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Si dejas esto en “—”, el gasto no se restará del saldo de Caja y bancos.
            </p>
          </div>
        </div>

        <div>
          <label className="label">Notas</label>
          <textarea className="input" name="notes" rows={2} defaultValue={expense?.notes ?? ""} />
        </div>

        {expense && (
          <AttachmentUploader
            organizationId={expense.organization_id}
            entityType="expense"
            entityId={expense.id}
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
