import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import journal from '../../../drizzle/meta/_journal.json';
import * as schema from '../schema';

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../drizzle',
);

/** sqlite_master, normalized: whitespace collapsed, ordered by (type, name). */
function masterOf(sqlite: Database.Database): string[] {
  const rows = sqlite
    .prepare(
      "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations' ORDER BY type, name",
    )
    .all() as { type: string; name: string; tbl_name: string; sql: string | null }[];
  return rows.map((r) =>
    [r.type, r.name, r.tbl_name, (r.sql ?? '').replace(/\s+/g, ' ').replace(/"/g, '`').trim()].join(
      ' | ',
    ),
  );
}

function dbAtPrefix(count: number): Database.Database {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(
    'CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (id INTEGER PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at numeric)',
  );
  for (const entry of journal.entries.slice(0, count)) {
    const body = fs.readFileSync(path.join(migrationsFolder, `${entry.tag}.sql`), 'utf8');
    for (const stmt of body.split('--> statement-breakpoint')) if (stmt.trim()) sqlite.exec(stmt);
    sqlite
      .prepare('INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)')
      .run(`test-${entry.tag}`, entry.when);
  }
  return sqlite;
}

/**
 * Generic upgrade-equivalence guard (UP01, reused by every later UP): for every
 * prefix of the journal, a DB built to that prefix and then migrated to head
 * has the same sqlite_master as a fresh DB migrated to head.
 */
describe('migration upgrade equivalence', () => {
  const fresh = new Database(':memory:');
  fresh.pragma('foreign_keys = ON');
  migrate(drizzle(fresh, { schema }), { migrationsFolder });
  const freshMaster = masterOf(fresh);

  it('the journal and the .sql files agree', () => {
    const files = fs
      .readdirSync(migrationsFolder)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => f.replace(/\.sql$/, ''))
      .sort();
    expect(journal.entries.map((e) => e.tag)).toEqual(files);
  });

  for (let i = 1; i <= journal.entries.length; i++) {
    it(`prefix ${i}/${journal.entries.length} (${journal.entries[i - 1]!.tag}) upgraded to head equals a fresh install`, () => {
      const sqlite = dbAtPrefix(i);
      migrate(drizzle(sqlite, { schema }), { migrationsFolder });
      expect(masterOf(sqlite)).toEqual(freshMaster);
    });
  }
});
