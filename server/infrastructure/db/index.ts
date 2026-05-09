import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../../../shared/schema.ts";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("[nura-x] DATABASE_URL is not set — DB operations will fail.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("[nura-x] PostgreSQL pool error:", err.message);
});

export const db = drizzle(pool, { schema });
export { pool };
