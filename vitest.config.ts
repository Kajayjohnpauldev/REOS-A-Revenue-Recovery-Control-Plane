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
    // The project path contains a space ("Razorpay Buildathon"); the default
    // `forks` pool fails to spawn workers on Windows in that case. Threads +
    // no file parallelism is robust and plenty fast for this suite.
    pool: "threads",
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
