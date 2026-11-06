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
  levelFromParam,
  levelParamOrNull,
} from '@/features/torfl/level-profile';

import { UK_PENDING } from '../flags';

/**
 * UT17b: «Іспит» is LIVE. The `uk-pending.exam` flag is deleted, no exam entry point consults it, the five level
 * shelves / hub tabs / achievements exist, and no TORFL (Russian) category or tab is reachable. Source-level on
 * purpose (React Native screens); the release-build walk on the S25 is the behavioural proof.
 */
const SRC = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');
function walk(dir: string): string[] {
  return fs.readdirSync(path.join(SRC, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    return e.isDirectory() ? walk(rel) : [rel];
  });
}

describe('UK_PENDING.exam is gone — «Іспит» is visible', () => {
  it('the key is deleted and nothing in src consults ukPending("exam")', () => {
    expect('exam' in UK_PENDING).toBe(false);
    const offenders = walk('.')
      .filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes('__tests__'))
      .filter((f) => /ukPending\(\s*'exam'\s*\)|UK_PENDING\.exam/.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it('every app/torfl and app/exam route renders its screen without a redirect', () => {
    const routes = [...walk('app/torfl'), ...walk('app/exam')].filter((f) => f.endsWith('.tsx'));
    expect(routes.length).toBe(14);
    for (const r of routes) {
      const src = read(r);
      expect(src, r).not.toMatch(/Redirect/);
      expect(src, r).toMatch(/export default function \w+/);
    }
  });

  it('the five «Іспит» Library shelves exist with Ukrainian labels, nothing else is a torfl shelf', () => {
    const exam = Object.keys(CATEGORIES).filter((k) => k.startsWith('ukr-exam-'));
    expect(exam).toEqual([
      'ukr-exam-a1',
      'ukr-exam-a2',
      'ukr-exam-b1',
      'ukr-exam-b2',
      'ukr-exam-c1',
    ]);
    for (const slug of exam) expect(isTorflCategory(slug)).toBe(true);
    expect(Object.keys(CATEGORIES).filter((k) => /^torfl/.test(k))).toEqual([]);
    expect(isTorflCategory('torfl')).toBe(false);
    expect(isTorflCategory('torfl-a2')).toBe(false);
    const lib = read('features/library/library-screen.tsx');
    expect(lib).not.toMatch(/ukPending/);
  });

  it('hub level tabs are exactly A1…C1 («Іспит · …»); a TORFL-style level param resolves to a Ukrainian level', () => {
    expect([...EXAM_LEVELS]).toEqual(['A1', 'A2', 'B1', 'B2', 'C1']);
    for (const l of EXAM_LEVELS) expect(UKR_PROFILES[l].chipLabel).toBe(`Іспит · ${l}`);
    expect(levelFromParam('torfl-a2')).toBe('A1');
    expect(levelParamOrNull('torfl')).toBeNull();
    expect(levelFromParam('A2')).toBe('A2');
    expect(levelFromParam(undefined)).toBe('A1');
  });

  it('Today, the daily deck row and the exam grading preset section are unconditional', () => {
    expect(read('features/today/today-screen.tsx')).toMatch(/\{activeLevels\.length > 0 && \(/);
    expect(read('app/settings.tsx')).toMatch(/<ExamGradingPresetSection \/>/);
    expect(read('features/review/daily/daily-settings-section.tsx')).toMatch(
      /Іспит: робота над помилками/,
    );
    expect(read('features/reader/reader-screen.tsx')).not.toMatch(/ukPending/);
  });

  it('the 20 level-scoped exam-* achievements are in the gallery; no torfl- id exists', () => {
    const exam = ACHIEVEMENTS.filter((a) => a.id.startsWith('exam-'));
    expect(exam.map((a) => a.id)).toEqual(
      EXAM_LEVELS.flatMap((l) => Object.values(achievementIdsFor(l))),
    );
    expect(exam.length).toBe(20);
    expect(ACHIEVEMENTS.some((a) => a.id.startsWith('torfl-'))).toBe(false);
    expect(read('features/motivation/achievements-screen.tsx')).not.toMatch(/ukPending/);
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

  it('the exam settings keys exist and are distinct (account-sync class recorded beside them)', () => {
    expect(SETTING_KEYS.torflExamDateB1).toBe('torfl.examDateB1');
    expect(SETTING_KEYS.torflLevel).toBe('torfl.level');
    const values = Object.values(SETTING_KEYS);
    expect(new Set(values).size).toBe(values.length);
    for (const l of EXAM_LEVELS) expect(values).toContain(UKR_PROFILES[l].examDateKey);
    const src = read('db/repositories/settings.ts');
    expect(src).toMatch(/DEVICE-LOCAL/);
    expect(src).toMatch(/SYNCED/);
  });

  it('the instruction-language toggle lives in torfl/ only; no exam source holds Russian-only letters', () => {
    const outside = walk('features')
      .filter(
        (f) => !f.startsWith('features/torfl') && /\.tsx?$/.test(f) && !f.includes('__tests__'),
      )
      .filter((f) => /useInstructionLangStore|InstructionLangToggle/.test(read(f)));
    expect(outside).toEqual([]);
    const files = [
      ...walk('features/torfl'),
      ...walk('app/torfl'),
      ...walk('app/exam'),
      ...walk('features/ai/prompts').filter((f) => /exam-/.test(f)),
    ].filter((f) => /\.tsx?$/.test(f) && !f.includes('__tests__'));
    const bad = files.filter((f) =>
      /[\u0451\u044b\u044d\u044a\u0401\u042b\u042d\u042a]/u.test(read(f)),
    );
    expect(bad).toEqual([]);
  });
});
