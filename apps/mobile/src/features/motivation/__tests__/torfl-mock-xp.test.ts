import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EXAM_LEVELS, UKR_PROFILES } from '@/features/torfl/level-profile';

import { ACHIEVEMENTS_BY_ID } from '../achievements';
import { recordExamFinished, recordExamVerdictUnlocks } from '../service';
import { XP_TABLE } from '../xp';

/**
 * T71: mock XP (15 per scored subtest, 60 per full mock, 100 first pass — ONE
 * `bumpDailyActivity` per attempt) and the three mock achievements per level, over a
 * mocked repo layer. The verdict-gated unlocks also fire from the T72/T73
 * path via `recordExamVerdictUnlocks`.
 */

const bumpDailyActivity = vi.hoisted(() => vi.fn());
const unlockAchievement = vi.hoisted(() => vi.fn());
const countCardsInReview = vi.hoisted(() => vi.fn());
const listAttempts = vi.hoisted(() => vi.fn());
vi.mock('@/db', () => ({
  repos: {
    stats: {
      bumpDailyActivity,
      unlockAchievement,
      getDailyActivity: vi.fn().mockResolvedValue(null),
      getStreakDays: vi.fn().mockResolvedValue({ met: new Set(), frozen: new Set() }),
      markGoalMet: vi.fn(),
      insertFrozenDays: vi.fn(),
      getTotalXp: vi.fn().mockResolvedValue(0),
      getScenarioStats: vi
        .fn()
        .mockResolvedValue({ finishedRunCount: 0, cleanRunCount: 0, familiesCompleted: 0 }),
    },
    bank: { countItems: vi.fn().mockResolvedValue(0) },
    reviews: { countMasteredLemmas: vi.fn().mockResolvedValue(0) },
    dialogues: {
      getAchievementStats: vi
        .fn()
        .mockResolvedValue({ finishedRunCount: 0, anyDialogueAllEndingsSeen: false }),
    },
    exams: { countCardsInReview, listAttempts },
    settings: { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined) },
  },
}));
vi.mock('@/services/analytics', () => ({ track: vi.fn() }));
vi.mock('@/lib/query-client', () => ({
  queryClient: { invalidateQueries: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@/store/goal-prefs', () => ({
  useGoalPrefs: { getState: () => ({ goal: { reviews: 0, readingMin: 0 } }) },
}));
vi.mock('../notifications', () => ({ replanReminders: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../toast-store', () => ({
  useAchievementToasts: { getState: () => ({ push: vi.fn() }) },
}));

beforeEach(() => {
  bumpDailyActivity.mockReset().mockResolvedValue(undefined);
  unlockAchievement.mockReset().mockResolvedValue(true);
  listAttempts.mockReset().mockResolvedValue([]);
});

const unlockedIds = () => unlockAchievement.mock.calls.map((c) => c[0] as string);
const five = (n: number) => ({ writing: n, lexgram: n, reading: n, listening: n, speaking: n });

describe('mock XP table', () => {
  it('15 / 60 / 100', () => {
    expect(XP_TABLE.examSubtestFinished).toBe(15);
    expect(XP_TABLE.examFullFinished).toBe(60);
    expect(XP_TABLE.examFirstPass).toBe(100);
  });
});

describe('recordExamFinished', () => {
  it('a three-subtest full mock: 3×15 + 60 once, first-mock unlocked, no verdict unlocks', async () => {
    const r = await recordExamFinished({
      scope: 'full',
      scoredSubtests: 3,
      pcts: { lexgram: 70, reading: 70, listening: 70 },
      verdict: null,
    });
    expect(r.xp).toBe(105);
    expect(bumpDailyActivity).toHaveBeenCalledWith({ xp: 105 });
    expect(unlockedIds()).toEqual(['exam-a1-first-mock']);
    expect(listAttempts).not.toHaveBeenCalled();
  });

  it('a single subtest: 15 XP; a high lexgram score unlocks nothing extra (no lexgram-90 any more)', async () => {
    const r = await recordExamFinished({
      scope: 'subtest',
      scoredSubtests: 1,
      pcts: { lexgram: 92 },
      verdict: null,
    });
    expect(r.xp).toBe(15);
    expect(unlockedIds()).toEqual(['exam-a1-first-mock']);
  });

  it('the first pass pays +100; a later pass does not (earlier finished pass in history)', async () => {
    const pass = {
      scope: 'full' as const,
      scoredSubtests: 5,
      pcts: five(85),
      verdict: 'pass' as const,
    };
    const first = await recordExamFinished(pass, { excludeAttemptId: 'me' });
    expect(first.xp).toBe(5 * 15 + 60 + 100);
    expect(unlockedIds()).toEqual(
      expect.arrayContaining(['exam-a1-first-mock', 'exam-a1-would-pass', 'exam-a1-margin']),
    );
    listAttempts.mockResolvedValue([
      { id: 'old', mode: 'mock', status: 'finished', verdict: 'pass-borderline' },
      { id: 'me', mode: 'mock', status: 'finished', verdict: 'pass' },
    ]);
    const second = await recordExamFinished(pass, { excludeAttemptId: 'me' });
    expect(second.xp).toBe(5 * 15 + 60);
  });

  it('a fail verdict never pays the pass bonus nor unlocks would-pass', async () => {
    const r = await recordExamFinished({
      scope: 'full',
      scoredSubtests: 5,
      pcts: five(40),
      verdict: 'fail',
    });
    expect(r.xp).toBe(5 * 15 + 60);
    expect(unlockedIds()).toEqual(['exam-a1-first-mock']);
  });
});

describe('recordExamVerdictUnlocks (T72/T73 path)', () => {
  it('fires only the verdict-gated pair', async () => {
    await recordExamVerdictUnlocks(five(90), 'pass');
    expect(unlockedIds().sort()).toEqual(['exam-a1-margin', 'exam-a1-would-pass']);
    unlockAchievement.mockClear();
    await recordExamVerdictUnlocks(five(70), 'pass');
    expect(unlockedIds()).toEqual(['exam-a1-would-pass']);
    unlockAchievement.mockClear();
    await recordExamVerdictUnlocks(five(40), 'fail');
    expect(unlockedIds()).toEqual([]);
  });

  it("'recordExamVerdictUnlocks A2 → only A2 ids'", async () => {
    await recordExamVerdictUnlocks(five(90), 'pass', 'A2');
    expect(unlockedIds().sort()).toEqual(['exam-a2-margin', 'exam-a2-would-pass']);
    expect(unlockedIds().some((id) => !id.startsWith('exam-a2-'))).toBe(false);
  });

  it('an A1 call unlocks only A1 ids', async () => {
    await recordExamVerdictUnlocks(five(90), 'pass', 'A1');
    expect(unlockedIds().sort()).toEqual(['exam-a1-margin', 'exam-a1-would-pass']);
  });
});

describe('recordExamFinished per level', () => {
  it("'recordExamFinished with level A2 unlocks A2 ids only + first pass per level'", async () => {
    // The repo filters by level, so the A2 query sees no earlier A2 pass.
    listAttempts.mockResolvedValue([]);
    const r = await recordExamFinished(
      {
        scope: 'full',
        scoredSubtests: 5,
        pcts: five(90),
        verdict: 'pass',
        level: 'A2',
      },
      { excludeAttemptId: 'me' },
    );
    expect(listAttempts).toHaveBeenCalledWith(expect.objectContaining({ level: 'A2' }));
    expect(r.xp).toBe(5 * 15 + 60 + 100);
    expect(unlockedIds().sort()).toEqual(
      ['exam-a2-first-mock', 'exam-a2-would-pass', 'exam-a2-margin'].sort(),
    );
    expect(unlockedIds().some((id) => !id.startsWith('exam-a2-'))).toBe(false);
  });
});

describe('definitions', () => {
  const t = (id: string) => ACHIEVEMENTS_BY_ID.get(id)?.title;

  it('the level titles are Ukrainian and carry the level letter', () => {
    expect(t('exam-a1-first-mock')).toBe('Перший пробний іспит A1');
    expect(t('exam-a1-would-pass')).toBe('A1: склав би!');
    expect(t('exam-b1-margin')).toBe('B1: із запасом');
    expect(t('exam-c1-deck-100')).toBe('C1: робота над помилками');
    for (const level of EXAM_LEVELS) {
      for (const id of Object.values(UKR_PROFILES[level].achievements)) {
        expect(t(id), id).toContain(level);
        expect(t(id), id).not.toMatch(/[ёыэъ]/i);
      }
    }
  });

  it('every profile achievement id exists for all five levels; no torfl-* id survives', () => {
    for (const level of EXAM_LEVELS) {
      for (const id of Object.values(UKR_PROFILES[level].achievements)) {
        expect(ACHIEVEMENTS_BY_ID.has(id)).toBe(true);
      }
    }
    expect([...ACHIEVEMENTS_BY_ID.keys()].filter((id) => id.startsWith('torfl-'))).toEqual([]);
    expect([...ACHIEVEMENTS_BY_ID.keys()].filter((id) => id.startsWith('exam-'))).toHaveLength(20);
  });
});

describe('recordExamFinished at the new levels', () => {
  it('B1 (four sections) unlocks the B1 trio only', async () => {
    listAttempts.mockResolvedValue([]);
    const r = await recordExamFinished(
      {
        scope: 'full',
        scoredSubtests: 4,
        pcts: { listening: 85, reading: 85, writing: 85, speaking: 85 },
        verdict: 'pass',
        level: 'B1',
      },
      { excludeAttemptId: 'me' },
    );
    expect(listAttempts).toHaveBeenCalledWith(expect.objectContaining({ level: 'B1' }));
    expect(r.xp).toBe(4 * 15 + 60 + 100);
    expect(unlockedIds().sort()).toEqual(
      ['exam-b1-first-mock', 'exam-b1-margin', 'exam-b1-would-pass'].sort(),
    );
  });

  it('B2 margin needs only reading / writing / speaking', async () => {
    await recordExamVerdictUnlocks({ reading: 90, writing: 90, speaking: 90 }, 'pass', 'B2');
    expect(unlockedIds().sort()).toEqual(['exam-b2-margin', 'exam-b2-would-pass']);
  });
});
