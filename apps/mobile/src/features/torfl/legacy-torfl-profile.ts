/**
 * LEGACY Sumrak TORFL level profiles (T75) — kept for the SPbU verdict rule
 * (`verdict.ts`) and the TORFL engine tests; UNREACHABLE from any Sutinki
 * surface (UT16b: the live profiles are `UKR_PROFILES` in `level-profile.ts`).
 * UT17 deletes this file together with `verdict.ts`. Russian labels stay as
 * authored (allowlist owner UT17).
 */

export const TORFL_LEVELS = ['A1', 'A2'] as const;
export type TorflA1A2 = (typeof TORFL_LEVELS)[number];

/** The eight level-scoped mock achievement ids (A2-11); `torfl-deck-100` is cross-level and not here. */
export type TorflAchievementId =
  | 'torfl-first-mock'
  | 'torfl-would-pass'
  | 'torfl-margin'
  | 'torfl-lexgram-90'
  | 'torfl-a2-first-mock'
  | 'torfl-a2-would-pass'
  | 'torfl-a2-margin'
  | 'torfl-a2-lexgram-90';

/** The four level-scoped verdict achievements of one level (A2-11). */
export interface TorflAchievementIds {
  firstMock: TorflAchievementId;
  wouldPass: TorflAchievementId;
  margin: TorflAchievementId;
  lexgram90: TorflAchievementId;
}

export interface TorflLevelProfile {
  level: TorflA1A2;
  /** ТЭУ / ТБУ — the official test name abbreviation. */
  code: string;
  /** «Элементарный уровень» / «Базовый уровень». */
  nameUk: string;
  nameEn: string;
  /** The Library chip / hub title / Today label: «ТРКИ-А1» / «ТРКИ-А2» (Cyrillic «А»). */
  chipLabel: string;
  /** The SPbU rule (A2-6): every subtest ≥ passPct, at most one in [borderlinePct, passPct). */
  passPct: number;
  borderlinePct: number;
  /** Real-exam pace, seconds per item (= subtest minutes × 60 ÷ items). */
  pace: { lexgram: number; reading: number; listening: number };
  /** The lexgram subtest the pace comes from (the «Молния» end-screen note «40 минут на 70 заданий»). */
  lexgramExam: { minutes: number; items: number };
  /** Говорение task 1 / task 2 answer caps (T76 wires). */
  speakingCapMs: { 1: number; 2: number };
  /** Monologue windows when the item carries none (T76 wires). */
  monologueDefaults: { prepSec: number; answerSec: number };
  /** Monologue length the task asks for (T76 wires). */
  monologueSentences: { min: number; max: number };
  /** Offline fluency bands, words per minute (T76 wires; A2 provisional until CT041 calibrates). */
  fluencyBands: { full: number; good: number; weak: number };
  /** The «HONEST …» standard line of both AI grading prompts (T76 wires). */
  aiStandard: string;
  /** The settings key holding this level's exam date. */
  examDateKey: 'torfl.examDate' | 'torfl.examDateA2';
  /** The Library category slug of this level's shelf. */
  category: 'torfl' | 'torfl-a2';
  achievements: TorflAchievementIds;
}

export const TORFL_PROFILES: Readonly<Record<TorflA1A2, TorflLevelProfile>> = {
  A1: {
    level: 'A1',
    code: 'ТЭУ',
    nameUk: 'Элементарный уровень',
    nameEn: 'Elementary',
    chipLabel: 'ТРКИ-А1',
    passPct: 66,
    borderlinePct: 60,
    pace: { lexgram: 34, reading: 96, listening: 90 },
    lexgramExam: { minutes: 40, items: 70 },
    speakingCapMs: { 1: 30_000, 2: 40_000 },
    monologueDefaults: { prepSec: 480, answerSec: 120 },
    monologueSentences: { min: 10, max: 12 },
    fluencyBands: { full: 70, good: 45, weak: 25 },
    aiStandard: 'HONEST A1 (ТЭУ)',
    examDateKey: 'torfl.examDate',
    category: 'torfl',
    achievements: {
      firstMock: 'torfl-first-mock',
      wouldPass: 'torfl-would-pass',
      margin: 'torfl-margin',
      lexgram90: 'torfl-lexgram-90',
    },
  },
  A2: {
    level: 'A2',
    code: 'ТБУ',
    nameUk: 'Базовый уровень',
    nameEn: 'Basic',
    chipLabel: 'ТРКИ-А2',
    passPct: 66,
    borderlinePct: 60,
    pace: { lexgram: 30, reading: 100, listening: 72 },
    lexgramExam: { minutes: 50, items: 100 },
    speakingCapMs: { 1: 45_000, 2: 60_000 },
    monologueDefaults: { prepSec: 600, answerSec: 300 },
    monologueSentences: { min: 12, max: 15 },
    fluencyBands: { full: 80, good: 55, weak: 30 },
    aiStandard: 'HONEST A2 (ТБУ, базовый уровень)',
    examDateKey: 'torfl.examDateA2',
    category: 'torfl-a2',
    achievements: {
      firstMock: 'torfl-a2-first-mock',
      wouldPass: 'torfl-a2-would-pass',
      margin: 'torfl-a2-margin',
      lexgram90: 'torfl-a2-lexgram-90',
    },
  },
};
