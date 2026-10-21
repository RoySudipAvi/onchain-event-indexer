import { Pool } from "pg";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
console.log("DB URL: ", process.env.DB_URL);
export const DB_URL = process.env.DB_URL;

export const pool = new Pool({
  connectionString: DB_URL,
});
export const db = drizzle({ client: pool });
