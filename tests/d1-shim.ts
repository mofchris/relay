// A minimal in-memory stand-in for Cloudflare D1, backed by Node's built-in
// SQLite, with the real migration applied. Lets the tests drive the API router
// exactly as the Pages Function does.

import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { D1Database, D1PreparedStatement } from "../api/db.ts";

const MIGRATIONS = join(import.meta.dirname, "..", "migrations");

type Value = null | number | bigint | string;

export function createTestDb(): D1Database {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  }

  const statement = (sql: string, values: Value[] = []): D1PreparedStatement => ({
    bind: (...next: unknown[]) => statement(sql, next as Value[]),
    first: async <T>() => (sqlite.prepare(sql).get(...values) as T | undefined) ?? null,
    all: async <T>() => ({ results: sqlite.prepare(sql).all(...values) as T[] }),
    run: async () => {
      const info = sqlite.prepare(sql).run(...values);
      return { meta: { last_row_id: Number(info.lastInsertRowid), changes: Number(info.changes) } };
    },
  });

  return {
    prepare: (sql) => statement(sql),
    batch: async (statements) => {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const s of statements) results.push(await s.run());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
}
