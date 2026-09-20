import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
      AUTH_SECRET: "test-secret-for-unit-tests",
      ENCRYPTION_KEY: "test-encryption-key-for-unit-tests",
      NODE_ENV: "test",
    },
  },
});
