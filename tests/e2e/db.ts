import "dotenv/config";
import { Client } from "pg";

/** Minimal DB access for e2e specs: find seeded rows and clean up what a test created. */
export async function withDb<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try { return await fn(c); } finally { await c.end(); }
}
