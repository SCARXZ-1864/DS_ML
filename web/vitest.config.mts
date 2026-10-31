import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    // Worker threads instead of child processes, and at most 4 at a time: launching a process
    // per test file fails with "spawn UNKNOWN" on low-memory machines (ERROR_LOG 2026-10-31).
    pool: "threads",
    maxWorkers: 4,
  },
});
