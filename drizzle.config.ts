import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration.
 *
 * Reads DATABASE_URL so migrations target whichever database the app is
 * configured for. The previous JSON config hard-coded
 * postgresql://postgres:postgres@127.0.0.1:5432/app_db, which made
 * `drizzle-kit push` ignore DATABASE_URL entirely.
 *
 * The literal below is only a local-development fallback and matches the
 * `db` service defaults in docker-compose.yml.
 */
const url =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/fox_ai_social";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url },
});
