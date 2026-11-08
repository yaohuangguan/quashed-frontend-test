// The only place the web app reads build-time configuration.
//
// Both values are public: the publishable key is meant to ship to browsers
// (https://supabase.com/docs/guides/api/api-keys). Never put a secret key here.
// Override them with VITE_API_URL and VITE_SUPABASE_PUBLISHABLE_KEY, for
// example to point at the local API (scripts/local-api.ts).
const DEFAULT_API_URL = "https://oljzvclugjgddwlwmaun.supabase.co/functions/v1/api";
const DEFAULT_PUBLISHABLE_KEY = "sb_publishable_Zvzb8HMi_ZfEDFdkZnIeZQ_bms2q6Vc";

export const config = {
  apiUrl: (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, ""),
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_PUBLISHABLE_KEY,
  /** How long each "Connecting..." / "Retrieving data..." screen shows at least. */
  stepDelayMs: Number(import.meta.env.VITE_STEP_DELAY_MS ?? 800),
} as const;
