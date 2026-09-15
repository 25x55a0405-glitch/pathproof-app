import { Pool } from "pg";

declare global {
  var _pool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://pathproof:pathproof_dev@127.0.0.1:5432/pathproof";
  if (!connectionString.trim()) {
    throw new Error(
      "DATABASE_URL is empty. Copy .env.example to .env.local and set it."
    );
  }
  return new Pool({
    connectionString,
    max: 8,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  });
}

export const pool = global._pool ?? createPool();

if (process.env.NODE_ENV !== "production") global._pool = pool;

pool.on("error", (e) => {
  console.error("pg pool error", e);
});

/** Run a parameterized query and return its rows. */
export async function q<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const hint = /ECONNREFUSED|ENOTFOUND|connect|timeout/i.test(msg)
      ? " Is Postgres running? See README Setup (docker compose up -d db) and check DATABASE_URL."
      : "";
    console.error("query failed:", sql.slice(0, 80), msg);
    // Callers show a friendly banner when the database is unreachable.
    throw new Error(`DB_UNAVAILABLE: ${msg}.${hint}`);
  }
}
