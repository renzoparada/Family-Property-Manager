"use client";

import { useMemo, useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, startOfMonthISO, endOfMonthISO } from "@/lib/format";
import { downloadCSV } from "@/lib/csv";
import type {
  Expense,
  ExpenseCategory,
  Investment,
  Loan,
  OrganizationMember,
  Property,
  Reservation,
} from "@/lib/types";

function startOfYearISO() {
  return new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
}
function endOfYearISO() {
  return new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0, 10);
}

export function ReportsClient({
  reservations,
  expenses,
  investments,
  loans,
  properties,
  categories,
  members,
  currency,
}: {
  reservations: Reservation[];
  expenses: Expense[];
  investments: Investment[];
  loans: Loan[];
  properties: Property[];
  categories: ExpenseCategory[];
  members: OrganizationMember[];
  currency: string;
}) {
  const [range, setRange] = useState<"month" | "year" | "custom">("month");
  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(endOfMonthISO());
  const [propertyFilter, setPropertyFilter] = useState("");

  const effectiveFrom = range === "month" ? startOfMonthISO() : range === "year" ? startOfYearISO() : from;
  const effectiveTo = range === "month" ? endOfMonthISO() : range === "year" ? endOfYearISO() : to;

  const filteredReservations = useMemo(
    () =>
      reservations.filter(
        (r) =>
          r.check_in >= effectiveFrom &&
          r.check_in <= effectiveTo &&
          (!propertyFilter || r.property_id === propertyFilter)
      ),
    [reservations, effectiveFrom, effectiveTo, propertyFilter]
  );

  const filteredExpenses = useMemo(
    () =>
      expenses.filter(
        (e) =>
          e.date >= effectiveFrom &&
          e.date <= effectiveTo &&
          (!propertyFilter || e.property_id === propertyFilter)
      ),
    [expenses, effectiveFrom, effectiveTo, propertyFilter]
  );

  const filteredInvestments = useMemo(
    () =>
      investments.filter(
        (i) =>
          i.date >= effectiveFrom &&
          i.date <= effectiveTo &&
          (!propertyFilter || i.property_id === propertyFilter)
      ),
    [investments, effectiveFrom, effectiveTo, propertyFilter]
  );

  const totalIncome = filteredReservations
    .filter((r) => r.status === "pagado")
    .reduce((s, r) => s + Number(r.net_amount), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalInvested = filteredInvestments.reduce((s, i) => s + Number(i.amount), 0);
  const profit = totalIncome - totalExpenses;

  const byProperty = properties.map((p) => {
    const income = filteredReservations
      .filter((r) => r.property_id === p.id && r.status === "pagado")
      .reduce((s, r) => s + Number(r.net_amount), 0);
    const cost = filteredExpenses.filter((e) => e.property_id === p.id).reduce((s, e) => s + Number(e.amount), 0);
    return { name: p.name, income, cost, profit: income - cost };
  });

  const byCategory = categories
    .map((c) => ({
      name: c.name,
      total: filteredExpenses.filter((e) => e.category_id === c.id).reduce((s, e) => s + Number(e.amount), 0),
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const byPlatform = (["airbnb", "booking", "google", "directo", "otro"] as const).map((platform) => ({
    name: platform,
    total: filteredReservations
      .filter((r) => r.platform === platform && r.status === "pagado")
      .reduce((s, r) => s + Number(r.net_amount), 0),
  }));

  const byPerson = members
    .map((m) => ({
      name: m.profile?.full_name || m.profile?.email || "Miembro",
      gastos: filteredExpenses.filter((e) => e.paid_by === m.user_id).reduce((s, e) => s + Number(e.amount), 0),
      inversiones: filteredInvestments.filter((i) => i.member_id === m.id).reduce((s, i) => s + Number(i.amount), 0),
      prestamos: loans.filter((l) => l.member_id === m.id).reduce((s, l) => s + Number(l.amount), 0),
    }))
    .filter((p) => p.gastos > 0 || p.inversiones > 0 || p.prestamos > 0);

  function exportExpensesCSV() {
    downloadCSV("gastos.csv", [
      ["Fecha", "Propiedad", "Categoría", "Descripción", "Monto"],
      ...filteredExpenses.map((e) => [
        e.date,
        properties.find((p) => p.id === e.property_id)?.name ?? "",
        categories.find((c) => c.id === e.category_id)?.name ?? "",
        e.description ?? "",
        e.amount,
      ]),
    ]);
  }

  function exportReservationsCSV() {
    downloadCSV("reservas.csv", [
      ["Ingreso", "Salida", "Propiedad", "Cliente", "Plataforma", "Bruto", "Comisión", "Neto", "Estado"],
      ...filteredReservations.map((r) => [
        r.check_in,
        r.check_out,
        properties.find((p) => p.id === r.property_id)?.name ?? "",
        r.guest_name,
        r.platform,
        r.gross_amount,
        r.commission_amount,
        r.net_amount,
        r.status,
      ]),
    ]);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="input !w-auto" value={range} onChange={(e) => setRange(e.target.value as typeof range)}>
          <option value="month">Este mes</option>
          <option value="year">Este año</option>
          <option value="custom">Personalizado</option>
        </select>
        {range === "custom" && (
          <>
            <input className="input !w-auto" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input className="input !w-auto" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </>
        )}
        <select className="input !w-auto" value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}>
          <option value="">Todas las propiedades</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <button className="btn-secondary text-xs" onClick={exportReservationsCSV}>
            Exportar reservas CSV
          </button>
          <button className="btn-secondary text-xs" onClick={exportExpensesCSV}>
            Exportar gastos CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ingresos" value={formatCurrency(totalIncome, currency)} accent="income" />
        <StatCard label="Gastos" value={formatCurrency(totalExpenses, currency)} accent="expense" />
        <StatCard label="Utilidad" value={formatCurrency(profit, currency)} accent={profit >= 0 ? "income" : "expense"} />
        <StatCard label="Inversión" value={formatCurrency(totalInvested, currency)} accent="investment" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ReportTable
          title="Por propiedad"
          columns={["Propiedad", "Ingresos", "Gastos", "Utilidad"]}
          rows={byProperty.map((p) => [
            p.name,
            formatCurrency(p.income, currency),
            formatCurrency(p.cost, currency),
            formatCurrency(p.profit, currency),
          ])}
        />
        <ReportTable
          title="Gastos por categoría"
          columns={["Categoría", "Total"]}
          rows={byCategory.map((c) => [c.name, formatCurrency(c.total, currency)])}
        />
        <ReportTable
          title="Ingresos por plataforma"
          columns={["Plataforma", "Total"]}
          rows={byPlatform.map((p) => [p.name, formatCurrency(p.total, currency)])}
        />
        <ReportTable
          title="Por persona"
          columns={["Persona", "Gastos", "Inversiones", "Préstamos"]}
          rows={byPerson.map((p) => [
            p.name,
            formatCurrency(p.gastos, currency),
            formatCurrency(p.inversiones, currency),
            formatCurrency(p.prestamos, currency),
          ])}
        />
      </div>
    </div>
  );
}

function ReportTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="card overflow-x-auto p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">Sin datos en el periodo seleccionado.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
