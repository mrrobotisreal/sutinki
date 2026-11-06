import { describe, expect, it } from 'vitest';

import { examAchievements, examXp, type ExamRewardInput } from '../rewards';

const five = (n: number) => ({ writing: n, lexgram: n, reading: n, listening: n, speaking: n });
const base: ExamRewardInput = {
  scope: 'full',
  scoredSubtests: 3,
  pcts: { lexgram: 50, reading: 50, listening: 50 },
  verdict: null,
  firstPass: true,
};

describe('examXp', () => {
  it('15 per scored subtest + 60 for a full mock', () => {
    expect(examXp(base)).toBe(3 * 15 + 60);
    expect(examXp({ ...base, scope: 'subtest', scoredSubtests: 1 })).toBe(15);
  });
  it('skipped placeholders earn nothing; a full mock with nothing scored earns nothing', () => {
    expect(examXp({ ...base, scoredSubtests: 0 })).toBe(0);
  });
  it('+100 only for the FIRST pass / pass-borderline verdict', () => {
    const pass = { ...base, scoredSubtests: 5, pcts: five(70), verdict: 'pass' as const };
    expect(examXp(pass)).toBe(5 * 15 + 60 + 100);
    expect(examXp({ ...pass, firstPass: false })).toBe(5 * 15 + 60);
    expect(examXp({ ...pass, verdict: 'pass-borderline' })).toBe(5 * 15 + 60 + 100);
    expect(examXp({ ...pass, verdict: 'fail' })).toBe(5 * 15 + 60);
  });
});

const four = (n: number) => ({ listening: n, reading: n, writing: n, speaking: n });

describe('examAchievements', () => {
  it('a scored mock: first-mock only (there is no lexgram-90 any more)', () => {
    expect(examAchievements(base)).toEqual(['exam-a1-first-mock']);
    expect(examAchievements({ ...base, pcts: { lexgram: 95 } })).toEqual(['exam-a1-first-mock']);
  });
  it('would-pass needs a verdict of pass / pass-borderline', () => {
    const v = { ...base, scoredSubtests: 4, pcts: four(75) };
    expect(examAchievements({ ...v, verdict: 'pass' })).toContain('exam-a1-would-pass');
    expect(examAchievements({ ...v, verdict: 'pass-borderline' })).toContain('exam-a1-would-pass');
    expect(examAchievements({ ...v, verdict: 'fail' })).not.toContain('exam-a1-would-pass');
    expect(examAchievements(base)).not.toContain('exam-a1-would-pass');
  });
  it('margin needs every section of the level at 80 or better, inside a verdict', () => {
    const v = { ...base, scoredSubtests: 4, verdict: 'pass' as const };
    expect(examAchievements({ ...v, pcts: four(80) })).toContain('exam-a1-margin');
    expect(examAchievements({ ...v, pcts: { ...four(85), speaking: 79.9 } })).not.toContain(
      'exam-a1-margin',
    );
    expect(
      examAchievements({ ...v, pcts: { listening: 90, reading: 90, writing: 90 } }),
    ).not.toContain('exam-a1-margin');
    expect(examAchievements({ ...v, verdict: null, pcts: four(90) })).not.toContain(
      'exam-a1-margin',
    );
  });
  it('nothing scored → nothing unlocked', () => {
    expect(examAchievements({ ...base, scoredSubtests: 0, pcts: {} })).toEqual([]);
  });
});

describe('per level', () => {
  const passFour = {
    ...base,
    scope: 'full' as const,
    scoredSubtests: 4,
    pcts: four(90),
    verdict: 'pass' as const,
  };
  const idsOf = (l: string) => [`exam-${l}-first-mock`, `exam-${l}-would-pass`, `exam-${l}-margin`];

  it('every level yields its own three ids, in order', () => {
    for (const level of ['A1', 'A2', 'B1', 'B2', 'C1'] as const) {
      expect(examAchievements({ ...passFour, level })).toEqual(idsOf(level.toLowerCase()));
    }
  });

  it('level absent → A1', () => {
    expect(examAchievements(passFour)).toEqual(idsOf('a1'));
  });

  it('B2 / C1 margin needs only their own three sections (no listening)', () => {
    const v = { ...passFour, pcts: { reading: 85, writing: 85, speaking: 85 } };
    expect(examAchievements({ ...v, level: 'B2' })).toContain('exam-b2-margin');
    expect(examAchievements({ ...v, level: 'C1' })).toContain('exam-c1-margin');
    expect(examAchievements({ ...v, level: 'B1' })).not.toContain('exam-b1-margin');
  });

  it('an input of one level never yields another level id', () => {
    const cases: ExamRewardInput[] = [
      { ...base, scope: 'full', scoredSubtests: 4, pcts: four(40), verdict: 'fail' },
      { ...base, scope: 'full', scoredSubtests: 4, pcts: four(75), verdict: 'pass' },
      { ...base, scoredSubtests: 1, pcts: { reading: 95 }, verdict: null },
    ];
    for (const c of cases) {
      for (const level of ['A1', 'A2', 'B1', 'B2', 'C1'] as const) {
        for (const id of examAchievements({ ...c, level })) {
          expect(id.startsWith(`exam-${level.toLowerCase()}-`)).toBe(true);
        }
      }
    }
  });
});
