// Display formatting for prices and times.
import { messages } from "../locales/en.ts";

/** 10688 -> "$106.88"; 100000 -> "$1,000" (whole dollars drop the cents). */
export function formatMoney(cents: number): string {
  const wholeDollars = cents % 100 === 0;
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: wholeDollars ? 0 : 2,
    maximumFractionDigits: wholeDollars ? 0 : 2,
  }).format(cents / 100);
}

/** "13 min ago", "2 h ago", "3 days ago". */
export function formatTimeAgo(iso: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return messages.time.justNow;
  if (minutes < 60) return messages.time.minutes(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return messages.time.hours(hours);
  return messages.time.days(Math.floor(hours / 24));
}
