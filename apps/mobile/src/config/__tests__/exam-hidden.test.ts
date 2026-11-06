import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ACHIEVEMENTS } from '@/features/motivation/achievements';
import { CATEGORIES } from '@/features/library/categories';
import { SETTING_KEYS } from '@/db/repositories/settings';
import {
  EXAM_LEVELS,
  UKR_PROFILES,
  achievementIdsFor,
  isTorflCategory,
} from '@/features/torfl/level-profile';

import { UK_PENDING } from '../flags';

/**
 * UP04 hide-list pin (docs/tickets/UP04): every TORFL entry point must stay behind
 * `ukPending('exam')` until UT17 flips it. Source-level on purpose — these are
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

  // UT16b: the five «Іспит · A1…C1» shelves arrive hidden behind the same flag.
  it('every «Іспит» Library chip is filtered while pending (all five shelves)', () => {
    const exam = Object.keys(CATEGORIES).filter((k) => k.startsWith('ukr-exam-'));
    expect(exam).toEqual(['ukr-exam-a1', 'ukr-exam-a2', 'ukr-exam-b1', 'ukr-exam-b2', 'ukr-exam-c1']);
    for (const slug of exam) expect(isTorflCategory(slug)).toBe(true);
    const lib = read('features/library/library-screen.tsx');
    expect(lib).toMatch(/ukPending\('exam'\) && isTorflCategory\(storedCategory\)/);
    expect(lib).toMatch(/ukPending\('exam'\) && isTorflCategory\(item.key\)/);
    expect(lib).toMatch(/isTorflCategory\(category\) && !ukPending\('exam'\)/);
  });

  it('no CEFR label mixes Cyrillic and Latin letters inside one word', () => {
    const labels = [
      ...Object.values(CATEGORIES).map((c) => c.uk),
      ...EXAM_LEVELS.flatMap((l) => [UKR_PROFILES[l].chipLabel, UKR_PROFILES[l].nameUk]),
    ];
    for (const label of labels) {
      for (const word of label.split(/[^\p{L}\p{N}]+/u)) {
        const cyr = /\p{Script=Cyrillic}/u.test(word);
        const lat = /\p{Script=Latin}/u.test(word);
        expect(cyr && lat, `${label} → ${word}`).toBe(false);
      }
    }
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

  it('the 20 level-scoped exam-* achievements are filtered with the rest of the torfl- ids', () => {
    const exam = ACHIEVEMENTS.filter((a) => a.id.startsWith('exam-'));
    expect(exam.map((a) => a.id)).toEqual(
      EXAM_LEVELS.flatMap((l) => Object.values(achievementIdsFor(l))),
    );
    expect(exam.length).toBe(20);
    expect(ACHIEVEMENTS.some((a) => a.id.startsWith('torfl-'))).toBe(false);
    expect(read('features/motivation/achievements-screen.tsx')).toMatch(
      /ukPending\('exam'\)\s*\?\s*ALL_ACHIEVEMENTS\.filter\(\(a\) => !a\.id\.startsWith\('torfl-'\) && !a\.id\.startsWith\('exam-'\)\)/,
    );
  });

  it('the new exam settings keys exist and are distinct (account-sync class recorded beside them)', () => {
    expect(SETTING_KEYS.torflExamDateB1).toBe('torfl.examDateB1');
    expect(SETTING_KEYS.torflExamDateB2).toBe('torfl.examDateB2');
    expect(SETTING_KEYS.torflExamDateC1).toBe('torfl.examDateC1');
    expect(SETTING_KEYS.torflLevel).toBe('torfl.level');
    const values = Object.values(SETTING_KEYS);
    expect(new Set(values).size).toBe(values.length);
    for (const l of EXAM_LEVELS) expect(values).toContain(UKR_PROFILES[l].examDateKey);
    const src = read('db/repositories/settings.ts');
    expect(src).toMatch(/DEVICE-LOCAL/);
    expect(src).toMatch(/SYNCED/);
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
