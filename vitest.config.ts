import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // The project path contains a space ("Razorpay Buildathon"), which makes
    // Vitest's per-file worker spawn flaky on Windows. Spawn ONE worker thread
    // and reuse it for every file (no per-file spawn, no isolation churn).
    pool: "threads",
    fileParallelism: false,
    isolate: false,
    maxWorkers: 1,
    minWorkers: 1,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
