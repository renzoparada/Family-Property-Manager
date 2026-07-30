"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/format";
import { createAccount, createManualTransaction } from "@/lib/actions/accounts";
import type { Account, Transaction } from "@/lib/types";

export function AccountsClient({
  accounts,
  transactions,
  currency,
  canWrite,
}: {
  accounts: Account[];
  transactions: Transaction[];
  currency: string;
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Account | null>(null);
  const [addingMovement, setAddingMovement] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const balances = useMemo(() => {
    const map = new Map<string, number>();
    for (const acc of accounts) map.set(acc.id, acc.opening_balance);
    for (const tx of transactions) {
      map.set(tx.account_id, (map.get(tx.account_id) ?? 0) + Number(tx.amount));
    }
    return map;
  }, [accounts, transactions]);

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

  const cashAccounts = accounts.filter((a) => a.type === "caja");
  const bankAccounts = accounts.filter((a) => a.type === "banco");

  return (
    <div>
      {canWrite && (
        <div className="mb-4">
          <button className="btn-primary" onClick={() => setCreating(true)}>
            + Nueva cuenta
          </button>
        </div>
      )}

      {accounts.length === 0 ? (
        <EmptyState title="Aún no registraste cuentas" description="Crea una caja o cuenta bancaria." />
      ) : (
        <div className="space-y-6">
          <AccountGroup
            title="Caja"
            accounts={cashAccounts}
            balances={balances}
            currency={currency}
            onView={setViewing}
            onMovement={canWrite ? setAddingMovement : undefined}
          />
          <AccountGroup
            title="Bancos"
            accounts={bankAccounts}
            balances={balances}
            currency={currency}
            onView={setViewing}
            onMovement={canWrite ? setAddingMovement : undefined}
          />
        </div>
      )}

      {error && <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>}

      {creating && (
        <Modal title="Nueva cuenta" onClose={() => setCreating(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              runAction(() => createAccount(fd), () => setCreating(false));
            }}
          >
            <div>
              <label className="label">Tipo</label>
              <select className="input" name="type" required defaultValue="caja">
                <option value="caja">Caja</option>
                <option value="banco">Banco</option>
              </select>
            </div>
            <div>
              <label className="label">Nombre</label>
              <input className="input" name="name" required placeholder="Caja Casa Playa" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Banco (opcional)</label>
                <input className="input" name="bank_name" />
              </div>
              <div>
                <label className="label">N° de cuenta (opcional)</label>
                <input className="input" name="account_number" />
              </div>
            </div>
            <div>
              <label className="label">Saldo inicial</label>
              <input className="input" name="opening_balance" type="number" step="0.01" defaultValue={0} />
            </div>
            <button className="btn-primary w-full" disabled={pending}>
              Guardar
            </button>
          </form>
        </Modal>
      )}

      {viewing && (
        <Modal title={`Movimientos — ${viewing.name}`} onClose={() => setViewing(null)}>
          <div className="mb-3 text-sm">
            Saldo actual:{" "}
            <span className="font-semibold">
              {formatCurrency(balances.get(viewing.id) ?? 0, currency)}
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {transactions
                  .filter((t) => t.account_id === viewing.id)
                  .map((t) => (
                    <tr key={t.id}>
                      <td>{formatDate(t.date)}</td>
                      <td>{t.description ?? sourceLabel(t.source_type)}</td>
                      <td
                        className={
                          Number(t.amount) >= 0
                            ? "text-[var(--color-income)]"
                            : "text-[var(--color-expense)]"
                        }
                      >
                        {formatCurrency(Number(t.amount), currency)}
                      </td>
                    </tr>
                  ))}
                {transactions.filter((t) => t.account_id === viewing.id).length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-[var(--color-muted)]">
                      Sin movimientos aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {addingMovement && (
        <Modal
          title={`Nuevo movimiento — ${addingMovement.name}`}
          onClose={() => setAddingMovement(null)}
        >
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              runAction(
                () => createManualTransaction(addingMovement.id, fd),
                () => setAddingMovement(null)
              );
            }}
          >
            <div>
              <label className="label">Tipo</label>
              <select className="input" name="direction" required defaultValue="ingreso">
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha</label>
                <input
                  className="input"
                  name="date"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div>
                <label className="label">Monto</label>
                <input className="input" name="amount" type="number" step="0.01" required />
              </div>
            </div>
            <div>
              <label className="label">Descripción</label>
              <input className="input" name="description" placeholder="Ajuste manual" />
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

function sourceLabel(source: string | null) {
  switch (source) {
    case "reservation":
      return "Reserva";
    case "expense":
      return "Gasto";
    case "investment":
      return "Inversión";
    case "loan":
      return "Préstamo recibido";
    case "loan_payment":
      return "Pago de préstamo";
    default:
      return "Movimiento manual";
  }
}

function AccountGroup({
  title,
  accounts,
  balances,
  currency,
  onView,
  onMovement,
}: {
  title: string;
  accounts: Account[];
  balances: Map<string, number>;
  currency: string;
  onView: (a: Account) => void;
  onMovement?: (a: Account) => void;
}) {
  if (accounts.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((acc) => (
          <div key={acc.id} className="card p-4">
            <div className="font-medium text-[var(--color-ink)]">{acc.name}</div>
            {acc.bank_name && (
              <div className="text-xs text-[var(--color-muted)]">
                {acc.bank_name} {acc.account_number ? `· ${acc.account_number}` : ""}
              </div>
            )}
            <div className="mt-2 text-xl font-semibold">
              {formatCurrency(balances.get(acc.id) ?? 0, currency)}
            </div>
            <div className="mt-3 flex gap-2">
              <button className="btn-secondary flex-1 text-xs" onClick={() => onView(acc)}>
                Ver movimientos
              </button>
              {onMovement && (
                <button
                  className="btn-secondary flex-1 text-xs"
                  onClick={() => onMovement(acc)}
                >
                  + Movimiento
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
