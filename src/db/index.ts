import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

type DB = NeonHttpDatabase<typeof schema>;

let _db: DB | null = null;

function getDb(): DB {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL environment variable is not set.");
    }
    _db = drizzle(neon(url), { schema, casing: "snake_case" });
  }
  return _db;
}

// Lazy proxy: importing `db` never connects or throws — the client is created
// (and DATABASE_URL validated) on first actual query. This keeps `next build`
// page-data collection from evaluating the client at module load.
export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
