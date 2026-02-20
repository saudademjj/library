import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

type GlobalWithDb = typeof globalThis & {
  __tech_stack_overview_pool?: Pool;
  __tech_stack_overview_db?: NodePgDatabase<typeof schema>;
};

const globalForDb = globalThis as GlobalWithDb;

let productionPool: Pool | undefined;
let productionDb: NodePgDatabase<typeof schema> | undefined;

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set (expected in .env.local).");
  }
  return url;
}

function createPool(): Pool {
  return new Pool({ connectionString: requireDatabaseUrl() });
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (process.env.NODE_ENV !== "production") {
    const pool = globalForDb.__tech_stack_overview_pool ?? createPool();
    globalForDb.__tech_stack_overview_pool = pool;

    const db = globalForDb.__tech_stack_overview_db ?? drizzle(pool, { schema });
    globalForDb.__tech_stack_overview_db = db;
    return db;
  }

  productionPool ??= createPool();
  productionDb ??= drizzle(productionPool, { schema });
  return productionDb;
}
