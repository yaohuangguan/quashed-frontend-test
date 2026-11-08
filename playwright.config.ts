import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run the built web app against the API code served locally
// (scripts/local-api.ts) with a throwaway Postgres, so they never touch the
// production Supabase project.
const API_PORT = 54331;
const WEB_PORT = 4180;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "off",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 760 } },
      grepInvert: /@mobile/,
    },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      command: `node scripts/local-api.ts`,
      env: { PORT: String(API_PORT) },
      url: `http://localhost:${API_PORT}/api/providers`,
      // Answers 401 without a key, which Playwright counts as "up".
      reuseExistingServer: false,
      timeout: 60_000,
      // Lets the server stop its Postgres cluster instead of being killed.
      gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    },
    {
      command: `npm run build -w web && npx -w web vite preview --port ${WEB_PORT} --strictPort`,
      env: {
        VITE_API_URL: `http://localhost:${API_PORT}/api`,
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_development_key",
      },
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
