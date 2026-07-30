import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { CashflowChart, type CashflowPoint } from "@/components/charts/cashflow-chart";
import { BalanceChart, type BalancePoint } from "@/components/charts/balance-chart";
import { formatCurrency, monthLabel, startOfMonthISO, endOfMonthISO, todayISO } from "@/lib/format";
import type { Account, Expense, Loan, LoanPayment, Reservation, Transaction } from "@/lib/types";

export default async function DashboardPage() {
  const session = await getSessionContext();
  if (!session?.activeOrgId) redirect("/login");
  const orgId = session.activeOrgId;

  const supabase = await createClient();
  const [
    { data: reservations },
    { data: expenses },
    { data: loans },
    { data: loanPayments },
    { data: accounts },
    { data: transactions },
    { data: org },
  ] = await Promise.all([
    supabase.from("reservations").select("*").eq("organization_id", orgId),
    supabase.from("expenses").select("*").eq("organization_id", orgId),
    supabase.from("loans").select("*").eq("organization_id", orgId),
    supabase
      .from("loan_payments")
      .select("*, loan:loans!inner(organization_id)")
      .eq("loan.organization_id", orgId),
    supabase.from("accounts").select("*").eq("organization_id", orgId),
    supabase.from("transactions").select("*").eq("organization_id", orgId),
    supabase.from("organizations").select("*").eq("id", orgId).single(),
  ]);

  const currency = org?.currency ?? "BOB";
  const allReservations = (reservations ?? []) as Reservation[];
  const allExpenses = (expenses ?? []) as Expense[];
  const allLoans = (loans ?? []) as Loan[];
  const allLoanPayments = (loanPayments ?? []) as unknown as LoanPayment[];
  const allAccounts = (accounts ?? []) as Account[];
  const allTransactions = (transactions ?? []) as Transaction[];

  const monthStart = startOfMonthISO();
  const monthEnd = endOfMonthISO();
  const today = todayISO();

  const monthIncome = allReservations
    .filter((r) => r.status === "pagado" && r.check_in >= monthStart && r.check_in <= monthEnd)
    .reduce((s, r) => s + Number(r.net_amount), 0);

  const monthExpenses = allExpenses
    .filter((e) => e.date >= monthStart && e.date <= monthEnd)
    .reduce((s, e) => s + Number(e.amount), 0);

  const monthProfit = monthIncome - monthExpenses;

  const activeReservations = allReservations.filter(
    (r) => r.status !== "cancelado" && r.check_out >= today
  ).length;

  const loanBalance = allLoans.reduce((sum, loan) => {
    const paid = allLoanPayments
      .filter((p) => p.loan_id === loan.id)
      .reduce((s, p) => s + Number(p.amount), 0);
    return sum + (Number(loan.amount) - paid);
  }, 0);

  const pendingReservationsAmount = allReservations
    .filter((r) => r.status === "pendiente")
    .reduce((s, r) => s + Number(r.net_amount), 0);

  const totalIncome = allReservations
    .filter((r) => r.status === "pagado")
    .reduce((s, r) => s + Number(r.net_amount), 0);
  const totalExpenses = allExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const accumulatedProfit = totalIncome - totalExpenses;

  // Cashflow for the last 6 months.
  const cashflow: CashflowPoint[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
    const ingresos = allReservations
      .filter((r) => r.status === "pagado" && r.check_in >= start && r.check_in <= end)
      .reduce((s, r) => s + Number(r.net_amount), 0);
    const gastos = allExpenses
      .filter((e) => e.date >= start && e.date <= end)
      .reduce((s, e) => s + Number(e.amount), 0);
    cashflow.push({ month: monthLabel(d), ingresos, gastos });
  }

  const balances: BalancePoint[] = allAccounts.map((acc) => {
    const moved = allTransactions
      .filter((t) => t.account_id === acc.id)
      .reduce((s, t) => s + Number(t.amount), 0);
    return { name: acc.name, balance: acc.opening_balance + moved };
  });

  return (
    <div>
      <PageHeader title="Panel" description={org?.name ? `Resumen financiero de ${org.name}` : undefined} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ingresos del mes" value={formatCurrency(monthIncome, currency)} accent="income" />
        <StatCard label="Gastos del mes" value={formatCurrency(monthExpenses, currency)} accent="expense" />
        <StatCard
          label="Ganancia del mes"
          value={formatCurrency(monthProfit, currency)}
          accent={monthProfit >= 0 ? "income" : "expense"}
        />
        <StatCard label="Reservas activas" value={String(activeReservations)} accent="accent" />
        <StatCard label="Dinero prestado por familiares" value={formatCurrency(loanBalance, currency)} accent="loan" />
        <StatCard label="Cuentas por cobrar (reservas pendientes)" value={formatCurrency(pendingReservationsAmount, currency)} />
        <StatCard
          label="Utilidad acumulada"
          value={formatCurrency(accumulatedProfit, currency)}
          accent={accumulatedProfit >= 0 ? "income" : "expense"}
        />
        <StatCard label="Cuentas activas" value={String(allAccounts.length)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Flujo de caja (6 meses)</h3>
          <CashflowChart data={cashflow} />
        </div>
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Balance por cuenta</h3>
          {balances.length > 0 ? (
            <BalanceChart data={balances} />
          ) : (
            <p className="py-10 text-center text-sm text-[var(--color-muted)]">
              Crea una cuenta en Caja y bancos para ver este gráfico.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
