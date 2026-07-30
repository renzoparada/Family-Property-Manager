export function StatCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: "income" | "expense" | "investment" | "loan" | "accent";
  hint?: string;
}) {
  const color = accent
    ? `var(--color-${accent === "accent" ? "accent" : accent})`
    : "var(--color-ink)";

  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-[var(--color-muted)]">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold" style={{ color }}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-[var(--color-muted)]">{hint}</div>}
    </div>
  );
}
