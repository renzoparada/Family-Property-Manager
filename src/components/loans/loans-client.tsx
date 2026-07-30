"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDate } from "@/lib/format";
import { createLoan, createLoanPayment } from "@/lib/actions/loans";
import type { Account, Loan, LoanPayment, OrganizationMember } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  parcial: "Pago parcial",
  pagado: "Pagado",
};

export function LoansClient({
  loans,
  payments,
  members,
  accounts,
  currency,
  canWrite,
}: {
  loans: Loan[];
  payments: LoanPayment[];
  members: OrganizationMember[];
  accounts: Account[];
  currency: string;
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);
  const [historyLoan, setHistoryLoan] = useState<Loan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalOwed = useMemo(() => {
    return loans.reduce((sum, loan) => {
      const paid = payments
        .filter((p) => p.loan_id === loan.id)
        .reduce((s, p) => s + Number(p.amount), 0);
      return sum + (Number(loan.amount) - paid);
    }, 0);
  }, [loans, payments]);

  function memberName(memberId: string) {
    const m = members.find((mm) => mm.id === memberId);
    return m?.profile?.full_name || m?.profile?.email || "Familiar";
  }

  function balanceOf(loan: Loan) {
    const paid = payments
      .filter((p) => p.loan_id === loan.id)
      .reduce((s, p) => s + Number(p.amount), 0);
    return Number(loan.amount) - paid;
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
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <StatCard label="Total que la sociedad debe" value={formatCurrency(totalOwed, currency)} accent="loan" />
        <StatCard label="Préstamos registrados" value={String(loans.length)} />
      </div>

      {canWrite && (
        <div className="mb-4">
          <button className="btn-primary" onClick={() => setCreating(true)}>
            + Registrar préstamo
          </button>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-[var(--color-danger)]">{error}</p>}

      {loans.length === 0 ? (
        <EmptyState
          title="Sin préstamos registrados"
          description="Cuando un familiar pague algo de su bolsillo por la sociedad, regístralo aquí."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Familiar</th>
                <th>Monto</th>
                <th>Saldo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td>{formatDate(loan.date)}</td>
                  <td>{memberName(loan.member_id)}</td>
                  <td>{formatCurrency(loan.amount, currency)}</td>
                  <td className="text-[var(--color-loan)]">{formatCurrency(balanceOf(loan), currency)}</td>
                  <td>
                    <span className="badge bg-[var(--color-loan)]/15 text-[var(--color-loan)]">
                      {STATUS_LABEL[loan.status]}
                    </span>
                  </td>
                  <td className="space-x-2 whitespace-nowrap">
                    <button className="btn-ghost !px-2 text-xs" onClick={() => setHistoryLoan(loan)}>
                      Historial
                    </button>
                    {canWrite && loan.status !== "pagado" && (
                      <button className="btn-ghost !px-2 text-xs" onClick={() => setPayingLoan(loan)}>
                        Registrar pago
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
        <Modal title="Registrar préstamo" onClose={() => setCreating(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              runAction(() => createLoan(fd), () => setCreating(false));
            }}
          >
            <div>
              <label className="label">Familiar</label>
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
              <input className="input" name="description" placeholder="Pago de electricidad de emergencia" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Interés % (opcional)</label>
                <input className="input" type="number" step="0.01" name="interest_rate" defaultValue={0} />
              </div>
              <div>
                <label className="label">Cuenta que recibe el dinero</label>
                <select className="input" name="account_id">
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

      {payingLoan && (
        <Modal title={`Registrar pago — ${memberName(payingLoan.member_id)}`} onClose={() => setPayingLoan(null)}>
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            Saldo pendiente: <span className="font-medium text-[var(--color-ink)]">{formatCurrency(balanceOf(payingLoan), currency)}</span>
          </p>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              runAction(() => createLoanPayment(payingLoan.id, fd), () => setPayingLoan(null));
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha</label>
                <input className="input" type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <label className="label">Monto</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  name="amount"
                  required
                  max={balanceOf(payingLoan)}
                />
              </div>
            </div>
            <div>
              <label className="label">Cuenta de origen</label>
              <select className="input" name="account_id">
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
              <input className="input" name="notes" />
            </div>
            <button className="btn-primary w-full" disabled={pending}>
              Registrar pago
            </button>
          </form>
        </Modal>
      )}

      {historyLoan && (
        <Modal title={`Historial — ${memberName(historyLoan.member_id)}`} onClose={() => setHistoryLoan(null)}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nota</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{formatDate(historyLoan.date)}</td>
                <td>Préstamo otorgado — {historyLoan.description ?? "—"}</td>
                <td className="text-[var(--color-loan)]">{formatCurrency(historyLoan.amount, currency)}</td>
              </tr>
              {payments
                .filter((p) => p.loan_id === historyLoan.id)
                .map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.date)}</td>
                    <td>{p.notes ?? "Pago"}</td>
                    <td className="text-[var(--color-expense)]">-{formatCurrency(p.amount, currency)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}
