// Calendar-date helpers. Dates travel as ISO "YYYY-MM-DD" strings so that time
// zones cannot shift them by a day.

/** The service operates in New Zealand, so "today" means today in Auckland. */
export const SERVICE_TIME_ZONE = "Pacific/Auckland";

/** Today's date in the given time zone, as YYYY-MM-DD. */
export function isoDateInZone(now: Date, timeZone: string = SERVICE_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "2025-10-10" -> "10/10/2025". */
export function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** True when the year and month are before the current month. */
export function isMonthInPast(month: number, year: number, now: Date): boolean {
  const today = isoDateInZone(now);
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  return year < currentYear || (year === currentYear && month < currentMonth);
}
