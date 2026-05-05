import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../../shared/schema.ts";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — Replit PostgreSQL not provisioned");
}

export const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });

export { schema };
