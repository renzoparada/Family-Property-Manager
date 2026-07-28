"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BalancePoint {
  name: string;
  balance: number;
}

export function BalanceChart({ data }: { data: BalancePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis type="number" stroke="var(--color-muted)" fontSize={12} />
        <YAxis dataKey="name" type="category" width={120} stroke="var(--color-muted)" fontSize={12} />
        <Tooltip
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="balance" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
