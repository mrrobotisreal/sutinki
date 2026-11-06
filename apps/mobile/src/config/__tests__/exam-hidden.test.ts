import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ACHIEVEMENTS } from '@/features/motivation/achievements';
import { CATEGORIES } from '@/features/library/categories';

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

  // UP06 (M19, T75-T77): the A2 level surfaces arrive hidden behind the same flag.
  it('the A2 Library chip is filtered while pending (both TORFL shelves, not only the A1 one)', () => {
    expect(Object.keys(CATEGORIES)).toContain('torfl-a2');
    const lib = read('features/library/library-screen.tsx');
    expect(lib).toMatch(/ukPending\('exam'\) && isTorflCategory\(storedCategory\)/);
    expect(lib).toMatch(/ukPending\('exam'\) && isTorflCategory\(item\.key\)/);
    expect(lib).toMatch(/isTorflCategory\(category\) && !ukPending\('exam'\)/);
  });

  it('Today level rows, the daily deck row and the daily segment are guarded', () => {
    expect(read('features/today/today-screen.tsx')).toMatch(
      /!ukPending\('exam'\) && activeLevels\.length > 0/,
    );
    expect(read('features/review/daily/daily-settings-section.tsx')).toMatch(
      /!ukPending\('exam'\) && \(/,
    );
    expect(read('features/review/daily/daily-session-screen.tsx')).toMatch(
      /focusItemIds \|\| ukPending\('exam'\)/,
    );
  });

  it('the four torfl-a2-* achievements are filtered with the rest of the torfl- ids', () => {
    const a2 = ACHIEVEMENTS.filter((a) => a.id.startsWith('torfl-a2-'));
    expect(a2.length).toBe(4);
    expect(read('features/motivation/achievements-screen.tsx')).toMatch(
      /ukPending\('exam'\)\s*\?\s*ALL_ACHIEVEMENTS\.filter\(\(a\) => !a\.id\.startsWith\('torfl-'\)\)/,
    );
  });

  it('the capture screen is a dev-only route and the instruction-language toggle lives in torfl/ only', () => {
    const outside = walk('features')
      .filter(
        (f) => !f.startsWith('features/torfl') && /\.tsx?$/.test(f) && !f.includes('__tests__'),
      )
      .filter((f) => /useInstructionLangStore|InstructionLangToggle/.test(read(f)));
    expect(outside).toEqual([]);
  });
});
