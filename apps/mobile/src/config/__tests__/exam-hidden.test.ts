import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { UK_PENDING } from '../flags';

/**
 * UP04 hide-list pin (docs/tickets/UP04): every TORFL entry point must stay behind
 * `ukPending('exam')` until UT16/UT17 re-target the exam. Source-level on purpose — these are
 * React Native screens; the release-build device walk is the behavioural proof.
 */
const SRC = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

const GUARDED_FILES = [
  'app/settings.tsx',
  'features/today/today-screen.tsx',
  'features/library/library-screen.tsx',
  'features/reader/reader-screen.tsx',
  'features/motivation/achievements-screen.tsx',
  'features/review/daily/daily-settings-section.tsx',
  'features/review/daily/daily-session-screen.tsx',
];

function walk(dir: string): string[] {
  return fs.readdirSync(path.join(SRC, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    return e.isDirectory() ? walk(rel) : [rel];
  });
}

describe('UK_PENDING.exam hide-list', () => {
  it('the flag is on', () => {
    expect(UK_PENDING.exam).toBe(true);
  });

  it.each(GUARDED_FILES)('%s consults ukPending("exam")', (rel) => {
    expect(read(rel)).toMatch(/ukPending\('exam'\)/);
  });

  it('every app/torfl and app/exam route redirects while pending', () => {
    const routes = [...walk('app/torfl'), ...walk('app/exam')].filter((f) => f.endsWith('.tsx'));
    expect(routes.length).toBe(14);
    for (const r of routes) {
      const src = read(r);
      expect(src, r).toMatch(/ukPending\('exam'\) \? <Redirect href="\/" \/>/);
    }
  });
});
