import { Pool } from "pg";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const DB_URL = process.env.DB_URL;
if (!DB_URL) throw new Error("DB_URL is not set");

export const pool = new Pool({
  connectionString: DB_URL,
});
pool.on("error", (err) => console.error("pg pool error:", err));
export const db = drizzle({ client: pool });
