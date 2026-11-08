/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const shared = fileURLToPath(new URL("../supabase/functions/_shared", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Validation rules and types shared with the Supabase Edge Function.
    alias: { "@shared": shared },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
