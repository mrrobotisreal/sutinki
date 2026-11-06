import { UKR_STATE_SHAPES } from '@sutinki/schema';
import { describe, expect, it } from 'vitest';

import {
  EXAM_LEVELS,
  MODELLED_BADGE,
  RELATIVE_NOTE,
  TORFL_PROFILES,
  UKR_PROFILES,
  achievementIdsFor,
  hubCardTitle,
  hubSubtitle,
  isTorflCategory,
  isTorflLevel,
  levelForCategory,
  levelFromParam,
  levelParamOrNull,
  lightningCaption,
  lightningPaceNote,
  profileFor,
  sectionKindsOf,
  thresholdLine,
  torflLevelOf,
} from '../level-profile';
import { PACE_SEC, LIGHTNING_PACE_SEC, paceFor, lightningPaceSec } from '../pace';

describe('the five Іспит levels', () => {
  it('EXAM_LEVELS is A1…C1 and the Sumrak alias is the same table', () => {
    expect([...EXAM_LEVELS]).toEqual(['A1', 'A2', 'B1', 'B2', 'C1']);
    expect(TORFL_PROFILES).toBe(UKR_PROFILES);
    for (const level of EXAM_LEVELS) expect(UKR_PROFILES[level].level).toBe(level);
  });

  it('labels: Іспит · <Latin letter>, Рівень <letter>', () => {
    expect(UKR_PROFILES.A1.chipLabel).toBe('Іспит · A1');
    expect(UKR_PROFILES.B1.chipLabel).toBe('Іспит · B1');
    expect(UKR_PROFILES.C1.chipLabel).toBe('Іспит · C1');
    expect(UKR_PROFILES.A2.nameUk).toBe('Рівень A2');
    expect(UKR_PROFILES.B2.nameEn).toBe('Level B2');
  });

  it('no label mixes Cyrillic and Latin letters inside one word', () => {
    for (const level of EXAM_LEVELS) {
      const p = UKR_PROFILES[level];
      for (const text of [
        p.chipLabel,
        p.nameUk,
        p.nameEn,
        hubCardTitle(level),
        hubSubtitle(level),
      ]) {
        for (const word of text.split(/[\s·,]+/)) {
          const cyr = /\p{Script=Cyrillic}/u.test(word);
          const lat = /\p{Script=Latin}/u.test(word);
          expect(cyr && lat, `«${word}» in «${text}»`).toBe(false);
        }
      }
    }
  });

  it('thresholds and sections come from UKR_STATE_SHAPES', () => {
    for (const level of EXAM_LEVELS) {
      const shape = UKR_STATE_SHAPES[level];
      const p = UKR_PROFILES[level];
      expect(p.passPct).toBe(shape.pass.totalPct);
      expect(p.modelled).toBe(shape.modelled);
      expect(p.sections).toBe(shape.sections);
      expect(sectionKindsOf(level)).toEqual(shape.sections.map((s) => s.kind));
    }
    expect(UKR_PROFILES.A1.passPct).toBe(70);
    expect(UKR_PROFILES.B2.passPct).toBe(60);
  });

  it('pace = section minutes × 60 ÷ items (lexgram is the flat study pace)', () => {
    for (const level of EXAM_LEVELS) {
      const shape = UKR_STATE_SHAPES[level];
      const p = UKR_PROFILES[level];
      expect(p.pace.lexgram).toBe(30);
      for (const kind of ['reading', 'listening'] as const) {
        const s =
          shape.sections.find((x) => x.kind === kind) ??
          shape.sections.find((x) => x.kind === 'reading')!;
        expect(p.pace[kind]).toBe(Math.round((s.durationMin * 60) / s.items));
      }
    }
    expect(paceFor('B1')).toBe(UKR_PROFILES.B1.pace);
    expect(paceFor()).toBe(UKR_PROFILES.A1.pace);
    expect(PACE_SEC).toBe(UKR_PROFILES.A1.pace);
    expect(LIGHTNING_PACE_SEC).toBe(30);
    expect(lightningPaceSec()).toBe(30);
    expect(lightningPaceSec('C1')).toBe(30);
  });

  it('modelled speaking numbers', () => {
    expect(UKR_PROFILES.A1.speakingCapMs).toEqual({ 1: 30_000, 2: 40_000 });
    expect(UKR_PROFILES.A2.speakingCapMs).toEqual({ 1: 40_000, 2: 50_000 });
    for (const l of ['B1', 'B2', 'C1'] as const) {
      expect(UKR_PROFILES[l].speakingCapMs).toEqual({ 1: 45_000, 2: 60_000 });
    }
    expect(UKR_PROFILES.A1.monologueDefaults).toEqual({ prepSec: 120, answerSec: 180 });
    expect(UKR_PROFILES.A2.monologueDefaults).toEqual({ prepSec: 180, answerSec: 240 });
    expect(UKR_PROFILES.B1.monologueDefaults).toEqual({ prepSec: 300, answerSec: 360 });
    expect(UKR_PROFILES.A1.fluencyBands).toEqual({ full: 60, good: 40, weak: 20 });
    expect(UKR_PROFILES.B1.monologueSentences).toEqual({ min: 20, max: 25 });
    expect(UKR_PROFILES.B1.aiStandard).toBe('HONEST B1 (державний іспит)');
    expect(UKR_PROFILES.A1.aiStandard).toBe('HONEST A1 (державний іспит, за зразком)');
  });

  it('exam-date keys, category slugs and achievement ids', () => {
    expect(EXAM_LEVELS.map((l) => UKR_PROFILES[l].examDateKey)).toEqual([
      'torfl.examDate',
      'torfl.examDateA2',
      'torfl.examDateB1',
      'torfl.examDateB2',
      'torfl.examDateC1',
    ]);
    expect(EXAM_LEVELS.map((l) => UKR_PROFILES[l].category)).toEqual([
      'ukr-exam-a1',
      'ukr-exam-a2',
      'ukr-exam-b1',
      'ukr-exam-b2',
      'ukr-exam-c1',
    ]);
    expect(UKR_PROFILES.B1.achievements).toEqual({
      firstMock: 'exam-b1-first-mock',
      wouldPass: 'exam-b1-would-pass',
      margin: 'exam-b1-margin',
      deck100: 'exam-b1-deck-100',
    });
    expect(achievementIdsFor('C1').deck100).toBe('exam-c1-deck-100');
    const all = EXAM_LEVELS.flatMap((l) => Object.values(UKR_PROFILES[l].achievements));
    expect(new Set(all).size).toBe(20);
  });
});

describe('level resolution', () => {
  it('profileFor: every level maps to itself; everything else → A1', () => {
    for (const l of EXAM_LEVELS) expect(profileFor(l)).toBe(UKR_PROFILES[l]);
    expect(profileFor('D1')).toBe(UKR_PROFILES.A1);
    expect(profileFor('')).toBe(UKR_PROFILES.A1);
    expect(profileFor(undefined)).toBe(UKR_PROFILES.A1);
    expect(profileFor(null)).toBe(UKR_PROFILES.A1);
  });

  it('torflLevelOf mirrors profileFor', () => {
    expect(torflLevelOf('B2')).toBe('B2');
    expect(torflLevelOf('A1')).toBe('A1');
    expect(torflLevelOf('C2')).toBe('A1');
    expect(torflLevelOf(undefined)).toBe('A1');
    expect(torflLevelOf(null)).toBe('A1');
  });

  it('isTorflLevel is case-sensitive', () => {
    expect(isTorflLevel('B1')).toBe(true);
    expect(isTorflLevel('b1')).toBe(false);
    expect(isTorflLevel('C2')).toBe(false);
    expect(isTorflLevel(3)).toBe(false);
  });

  it('levelFromParam tolerates arrays, case, spaces and Cyrillic look-alikes', () => {
    expect(levelFromParam(undefined)).toBe('A1');
    expect(levelFromParam('B1')).toBe('B1');
    expect(levelFromParam('b1')).toBe('B1');
    expect(levelFromParam(' c1 ')).toBe('C1');
    expect(levelFromParam('А2')).toBe('A2');
    expect(levelFromParam('В1')).toBe('B1');
    expect(levelFromParam('В2')).toBe('B2');
    expect(levelFromParam('С1')).toBe('C1');
    expect(levelFromParam(['B2', 'A1'])).toBe('B2');
    expect(levelFromParam([])).toBe('A1');
    expect(levelFromParam('D1')).toBe('A1');
    expect(levelFromParam('')).toBe('A1');
    expect(levelParamOrNull('D1')).toBeNull();
    expect(levelParamOrNull(undefined)).toBeNull();
    expect(levelParamOrNull('b2')).toBe('B2');
  });

  it('levelForCategory and isTorflCategory cover the five shelves only', () => {
    expect(levelForCategory('ukr-exam-a1')).toBe('A1');
    expect(levelForCategory('ukr-exam-b1')).toBe('B1');
    expect(levelForCategory('ukr-exam-c1')).toBe('C1');
    expect(levelForCategory('torfl')).toBeNull();
    expect(levelForCategory('stories')).toBeNull();
    expect(levelForCategory(null)).toBeNull();
    expect(levelForCategory(undefined)).toBeNull();
    for (const l of EXAM_LEVELS) expect(isTorflCategory(UKR_PROFILES[l].category)).toBe(true);
    expect(isTorflCategory('education')).toBe(false);
    expect(isTorflCategory('torfl-a2')).toBe(false);
  });
});

describe('copy builders', () => {
  it('thresholdLine reads the shape', () => {
    expect(thresholdLine('A1')).toBe('Поріг: 70 %');
    expect(thresholdLine('B2')).toBe('Поріг: 60 %');
  });

  it('hubSubtitle and hubCardTitle', () => {
    expect(hubSubtitle('A1')).toBe(`Рівень A1 · державна мова, ${MODELLED_BADGE}`);
    expect(hubSubtitle('B1')).toBe('Рівень B1 · іспит з державної мови');
    expect(hubCardTitle('B1')).toBe('Іспит · B1 · Рівень B1');
    expect(hubCardTitle('A2')).toBe('Іспит · A2 · Рівень A2');
    expect(RELATIVE_NOTE).toBe('Орієнтир, не офіційна оцінка');
  });

  it('lightningCaption and lightningPaceNote', () => {
    expect(lightningCaption('A1')).toBe('20 завдань у швидкому темпі — 30 секунд на завдання');
    expect(lightningCaption('B1', 21)).toBe('21 завдання у швидкому темпі — 30 секунд на завдання');
    expect(lightningPaceNote('B1')).toBe('Темп тренування — 30 с на завдання.');
  });
});
