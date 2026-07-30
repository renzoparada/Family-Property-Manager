"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface CashflowPoint {
  month: string;
  ingresos: number;
  gastos: number;
}

export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="month" stroke="var(--color-muted)" fontSize={12} />
        <YAxis stroke="var(--color-muted)" fontSize={12} />
        <Tooltip
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="ingresos" fill="var(--color-income)" radius={[4, 4, 0, 0]} name="Ingresos" />
        <Bar dataKey="gastos" fill="var(--color-expense)" radius={[4, 4, 0, 0]} name="Gastos" />
      </BarChart>
    </ResponsiveContainer>
  );
}
