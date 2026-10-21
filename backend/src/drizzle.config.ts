import { defineConfig } from "drizzle-kit";
import { DB_URL } from "./db.ts";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations/",
  dialect: "postgresql",
  dbCredentials: {
    url: DB_URL,
  },
  strict: true,
  verbose: true,
});
