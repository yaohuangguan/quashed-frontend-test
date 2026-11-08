import { defineConfig } from "vitest/config";

// Tests for the Supabase Edge Function and the shared rules. The web app has
// its own config in web/.
export default defineConfig({
  test: {
    include: ["supabase/**/*.test.ts"],
    globalSetup: ["scripts/test-database.ts"],
    // API test files share one database, so they run one at a time.
    fileParallelism: false,
  },
});
