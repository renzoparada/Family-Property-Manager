export function formatCurrency(amount: number, currency = "BOB") {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
}

// Plain "date" columns (e.g. expenses.date) come back as "YYYY-MM-DD" and
// need the "T00:00:00" suffix so they parse in local time instead of UTC.
// "timestamptz" columns (e.g. created_at, last_seen_at) already come back
// as full ISO strings — appending another time-of-day to those produces an
// invalid string that crashes Intl.DateTimeFormat. Only pad the former.
function toDate(date: string | Date) {
  if (typeof date !== "string") return date;
  return new Date(date.includes("T") ? date : date + "T00:00:00");
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(toDate(date));
}

export function formatDateShort(date: string | Date) {
  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "2-digit",
  }).format(toDate(date));
}

export function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-BO", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatLastSeen(date: string | null) {
  if (!date) return "Nunca";
  const then = new Date(date).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Ahora mismo";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return formatDate(date);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function startOfMonthISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function endOfMonthISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
}
