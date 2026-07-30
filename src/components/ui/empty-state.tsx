export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 p-10 text-center">
      <p className="font-medium text-[var(--color-ink)]">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-[var(--color-muted)]">{description}</p>
      )}
      {action}
    </div>
  );
}
