import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Engine/adapter/DB tests are pure logic + Prisma — no DOM needed. The
    // `node` environment starts far faster and more reliably than jsdom.
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
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
