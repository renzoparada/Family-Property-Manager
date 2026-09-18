// Minimal RFC 5545 (iCalendar) reader — just enough to pull VEVENT date
// ranges out of an Airbnb/Booking.com calendar export. No dependency: the
// format we actually need to handle (folded lines, a handful of
// properties) is small enough that a parser library would be overkill.

export interface IcalEvent {
  uid: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  summary: string;
}

// Long lines in an .ics file are "folded" across multiple physical lines —
// every continuation line starts with a space or tab, which must be
// stripped and joined back onto the previous logical line before parsing.
function unfold(text: string): string[] {
  const rawLines = text.split(/\r\n|\n|\r/);
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

// Handles both all-day values (DTSTART;VALUE=DATE:20260810) and date-time
// values (DTSTART:20260810T150000Z) — we only ever care about the date.
function parseDateValue(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 8);
  if (digits.length < 8) return raw;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function parseIcs(text: string): IcalEvent[] {
  const lines = unfold(text);
  const events: IcalEvent[] = [];
  let current: Partial<IcalEvent> | null = null;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = {};
      continue;
    }
    if (line.startsWith("END:VEVENT")) {
      if (current?.uid && current.start && current.end) {
        events.push({
          uid: current.uid,
          start: current.start,
          end: current.end,
          summary: current.summary ?? "",
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).split(";")[0].toUpperCase();
    const value = line.slice(idx + 1).trim();
    if (key === "UID") current.uid = value;
    else if (key === "DTSTART") current.start = parseDateValue(value);
    else if (key === "DTEND") current.end = parseDateValue(value);
    else if (key === "SUMMARY") current.summary = value;
  }

  return events;
}

// Airbnb/Booking also export the host's own manual blocks (vacations,
// maintenance) in the same feed, with summaries like "Not available" /
// "Blocked" / "Closed - Not available for booking" — those aren't real
// bookings and would just clutter Reservations, so filter them out.
export function isRealBookingEvent(summary: string): boolean {
  const s = summary.toLowerCase();
  return !s.includes("not available") && !s.includes("blocked") && !s.includes("closed");
}

export async function fetchIcs(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new Error("No se pudo conectar con el link del calendario.");
  }
  if (!res.ok) {
    throw new Error(`El calendario respondió con un error (HTTP ${res.status}).`);
  }
  return res.text();
}
