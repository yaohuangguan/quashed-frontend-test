// Deno entry point for the `api` Edge Function. Reads configuration from the
// environment once, then serves requests. Everything else is in app.ts.
import postgres from "postgres";
import { createApp } from "./app.ts";

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/** Publishable keys the web app may send, from SUPABASE_PUBLISHABLE_KEYS. */
function publishableKeys(): string[] {
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null) return [];
  return Object.values(parsed).filter((v): v is string => typeof v === "string");
}

// The pooled connection runs in transaction mode, which does not support
// prepared statements.
const sql = postgres(requireEnv("SUPABASE_DB_URL"), { prepare: false, max: 3 });

const handle = createApp({
  sql,
  apiKeys: publishableKeys(),
  now: () => new Date(),
  logError: (event, fields) => console.error(JSON.stringify({ event, ...fields })),
});

Deno.serve(handle);
