#!/usr/bin/env node
// Schema equivalence proof for an UP: Sutinki's migrations (whole journal) vs Sumrak's migrations at <sumrak-stop>.
// Equal modulo the ru -> uk column rename, column ORDER (Sutinki's 0000_init is collapsed) and the FTS objects
// (Sutinki's FTS migration is deliberately different, UT03). Triggers/indexes compared by normalized SQL.
// usage (from Sutinki/apps/mobile; Node >= 22.5, built-in node:sqlite, no install):
//   node ../../scripts/upstream/schema-diff.mjs <sumrak-stop> [sumrak-repo=../../../../Russian/Sumrak]
// exit 0 = equivalent, 1 = differences printed. Run it with the stop of the UP you just finished (and the fork baseline 350425a to see the known gap).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const stop = process.argv[2];
const repo = path.resolve(process.argv[3] ?? '../../../../Russian/Sumrak');
if (!stop) throw new Error('usage: schema-diff.mjs <sumrak-stop> [sumrak-repo]');

const git = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const tags = (j) => JSON.parse(j).entries.map((e) => e.tag);
function build(bodies) {
  const db = new DatabaseSync(':memory:');
  for (const body of bodies) for (const stmt of body.split('--> statement-breakpoint')) if (stmt.trim()) db.exec(stmt);
  return db;
}
const sumrakTags = tags(git('show', `${stop}:apps/mobile/drizzle/meta/_journal.json`));
const sumrak = build(sumrakTags.map((t) => git('show', `${stop}:apps/mobile/drizzle/${t}.sql`)));
const dir = path.resolve('drizzle');
const sutTags = tags(fs.readFileSync(path.join(dir, 'meta/_journal.json'), 'utf8'));
const sut = build(sutTags.map((t) => fs.readFileSync(path.join(dir, `${t}.sql`), 'utf8')));

const ru2uk = (s) => s.replace(/\b(\w*?)_ru\b/g, '$1_uk').replace(/(?<![\w])ru(?![\w])/g, 'uk');
const ws = (s) => ru2uk(s.replace(/`/g, '').replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+,/g, ',').trim());
const isFts = (n) => /fts/i.test(n) || /^(tokens|notes|journal)_(ai|ad|au)$/.test(n);

function dump(db) {
  const out = new Map();
  const objs = db.prepare(`SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'`).all();
  for (const o of objs) {
    if (isFts(o.name) || isFts(o.tbl_name)) continue;
    if (o.type === 'table') {
      const cols = db.prepare(`PRAGMA table_info("${o.name}")`).all()
        .map((c) => `${ru2uk(c.name)}:${c.type.toLowerCase()}:nn${c.notnull}:d${c.dflt_value ?? '-'}:pk${c.pk}`).sort().join(' | ');
      const fks = db.prepare(`PRAGMA foreign_key_list("${o.name}")`).all().map((f) => `${ru2uk(f.from)}->${f.table}.${f.to}:${f.on_delete}`).sort().join(',');
      out.set(`table:${ru2uk(o.name)}`, `${cols} || fk ${fks}`);
    } else if (o.sql) out.set(`${o.type}:${ru2uk(o.name)}`, ws(o.sql));
  }
  return out;
}
const a = dump(sumrak), b = dump(sut);
let bad = 0;
for (const k of [...new Set([...a.keys(), ...b.keys()])].sort()) {
  if (!a.has(k)) { console.log(`ONLY IN SUTINKI  ${k}`); bad++; }
  else if (!b.has(k)) { console.log(`ONLY IN SUMRAK   ${k}`); bad++; }
  else if (a.get(k) !== b.get(k)) { console.log(`DIFFERS          ${k}\n  sumrak : ${a.get(k)}\n  sutinki: ${b.get(k)}`); bad++; }
}
console.log(bad === 0 ? `schema-diff OK: ${a.size} objects equivalent (Sumrak@${stop} [${sumrakTags.length} migrations] vs Sutinki [${sutTags.length}, last ${sutTags.at(-1)}])` : `schema-diff FAIL: ${bad} difference(s)`);
process.exit(bad ? 1 : 0);
