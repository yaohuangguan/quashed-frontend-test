// Input masks: turn what the user typed into the display format from the
// design, and parse it back into values the API accepts.

const digits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);

/** "12102025" -> "12 / 10 / 2025", built up as the user types. */
export function maskDate(value: string): string {
  const d = digits(value, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join(" / ");
}

/** "10 / 10 / 2025" -> "2025-10-10", or null if incomplete or not a real date. */
export function parseMaskedDate(value: string): string | null {
  const d = digits(value, 8);
  if (d.length !== 8) return null;
  const iso = `${d.slice(4)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) ? iso : null;
}

/** "2025-10-10" -> "10 / 10 / 2025". */
export function isoToMaskedDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day} / ${month} / ${year}`;
}

/** "122025" -> "12 / 2025". */
export function maskMonth(value: string): string {
  const d = digits(value, 6);
  return [d.slice(0, 2), d.slice(2)].filter(Boolean).join(" / ");
}

/** "12 / 2025" -> { month: 12, year: 2025 }, or null if incomplete or invalid. */
export function parseMaskedMonth(value: string): { month: number; year: number } | null {
  const d = digits(value, 6);
  if (d.length !== 6) return null;
  const month = Number(d.slice(0, 2));
  const year = Number(d.slice(2));
  return month >= 1 && month <= 12 ? { month, year } : null;
}

/** "2025-12" (from <input type="month">) -> "12 / 2025". */
export function isoMonthToMasked(isoMonth: string): string {
  const [year, month] = isoMonth.split("-");
  return `${month} / ${year}`;
}

/** Groups card digits in fours: "1234567891011121" -> "1234 5678 9101 1121". */
export function maskCardNumber(value: string): string {
  return digits(value, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** Keeps up to four digits for the CVV. */
export function maskCvv(value: string): string {
  return digits(value, 4);
}
