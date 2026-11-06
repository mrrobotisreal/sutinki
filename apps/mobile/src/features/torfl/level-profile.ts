import { UKR_STATE_SHAPES, type ExamSubtestKind, type UkrStateSection } from '@sutinki/schema';

import { pluralUk } from '@/lib/uk-plural';

/**
 * The «Іспит» level profile (UT16b, UKR_EXAM_PREP §2/§4, ADR-0011) — PURE. One
 * row per exam level A1…C1 holds every level-specific number and label, so no
 * screen hard-codes a level. Numbers that exist in the state-exam shape
 * (`UKR_STATE_SHAPES`, UT16a) are DERIVED from it — never copied; the few
 * values the shape does not carry (monologue windows, fluency bands, answer
 * caps) are `[modelled]` and will be calibrated by UT17.
 *
 * THE LEVEL RULE: every exam surface takes an `ExamLevel` and filters by it —
 * an exam's level is `exams.level`; attempts / responses / deck cards inherit
 * it by join on `(pack_id, exam_id)`. Unknown or missing levels fall back to A1.
 */

export const EXAM_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export type ExamLevel = (typeof EXAM_LEVELS)[number];
/** Back-compat alias — the Sumrak name; the engine files keep importing it (merge hygiene, Decision 1). */
export type TorflLevel = ExamLevel;
export const TORFL_LEVELS = EXAM_LEVELS;

/** The four level-scoped achievement ids of one level: `exam-<l>-first-mock | would-pass | margin | deck-100`. */
export interface ExamAchievementIds {
  firstMock: string;
  wouldPass: string;
  margin: string;
  deck100: string;
}
export type TorflAchievementId = string;

export function achievementIdsFor(level: ExamLevel): ExamAchievementIds {
  const l = level.toLowerCase();
  return {
    firstMock: `exam-${l}-first-mock`,
    wouldPass: `exam-${l}-would-pass`,
    margin: `exam-${l}-margin`,
    deck100: `exam-${l}-deck-100`,
  };
}

export type ExamDateKey =
  | 'torfl.examDate'
  | 'torfl.examDateA2'
  | 'torfl.examDateB1'
  | 'torfl.examDateB2'
  | 'torfl.examDateC1';

export interface ExamLevelProfile {
  level: ExamLevel;
  /** «Рівень A1». */
  nameUk: string;
  nameEn: string;
  /** The Library chip / hub title / Today label — «Іспит · A1» (Latin level letter, UI_DESIGN). */
  chipLabel: string;
  /** The state-exam pass threshold, % of the weighted total (from the shape). */
  passPct: number;
  /** True where UKR_EXAM_PREP §2 says the level is modelled («за зразком державного іспиту»). */
  modelled: boolean;
  /** The ordered sections of a mock at this level (from the shape) — tabs, readiness rows. */
  sections: readonly UkrStateSection[];
  /** Real-exam pace, seconds per item (= section minutes × 60 ÷ items). `lexgram` = the study-only drill pace. */
  pace: { lexgram: number; reading: number; listening: number };
  /** Answer caps of the short speaking tasks, ms [modelled; UT17 wires]. */
  speakingCapMs: { 1: number; 2: number };
  /** Monologue windows when the item carries none [modelled; UT17 wires]. */
  monologueDefaults: { prepSec: number; answerSec: number };
  /** Monologue length the task asks for, phrases (from the shape). */
  monologueSentences: { min: number; max: number };
  /** Offline fluency bands, words per minute [modelled; UT17 calibrates]. */
  fluencyBands: { full: number; good: number; weak: number };
  /** The «HONEST …» standard line of both AI grading prompts [UT17 wires]. */
  aiStandard: string;
  /** The settings key holding this level's exam date. */
  examDateKey: ExamDateKey;
  /** The Library category slug of this level's shelf. */
  category: `ukr-exam-${'a1' | 'a2' | 'b1' | 'b2' | 'c1'}`;
  achievements: ExamAchievementIds;
}

/** Study-only grammar drills have no exam analogue: a flat modelled pace. */
const LEXGRAM_PACE_SEC = 30; // [modelled]

function paceOf(level: ExamLevel, kind: 'reading' | 'listening'): number {
  const s = UKR_STATE_SHAPES[level].sections.find((x) => x.kind === kind);
  if (s) return Math.round((s.durationMin * 60) / Math.max(1, s.items));
  // B2/C1 have no listening section (the officials' instrument): reuse reading's per-item pace.
  const r = UKR_STATE_SHAPES[level].sections.find((x) => x.kind === 'reading');
  return r ? Math.round((r.durationMin * 60) / Math.max(1, r.items)) : 90;
}

function phrases(level: ExamLevel): { min: number; max: number } {
  const sp = UKR_STATE_SHAPES[level].sections.find((x) => x.kind === 'speaking');
  return sp?.speakingTasks?.monologuePhrases ?? { min: 20, max: 25 };
}

/** [modelled] values the shape does not state — UT17 calibrates them on real attempts. */
const MODELLED: Record<
  ExamLevel,
  {
    cap: { 1: number; 2: number };
    mono: { prepSec: number; answerSec: number };
    wpm: { full: number; good: number; weak: number };
  }
> = {
  A1: {
    cap: { 1: 30_000, 2: 40_000 },
    mono: { prepSec: 120, answerSec: 180 },
    wpm: { full: 60, good: 40, weak: 20 },
  },
  A2: {
    cap: { 1: 40_000, 2: 50_000 },
    mono: { prepSec: 180, answerSec: 240 },
    wpm: { full: 70, good: 45, weak: 25 },
  },
  B1: {
    cap: { 1: 45_000, 2: 60_000 },
    mono: { prepSec: 300, answerSec: 360 },
    wpm: { full: 80, good: 55, weak: 30 },
  },
  B2: {
    cap: { 1: 45_000, 2: 60_000 },
    mono: { prepSec: 300, answerSec: 480 },
    wpm: { full: 90, good: 65, weak: 35 },
  },
  C1: {
    cap: { 1: 45_000, 2: 60_000 },
    mono: { prepSec: 300, answerSec: 600 },
    wpm: { full: 100, good: 75, weak: 40 },
  },
};

const DATE_KEYS: Record<ExamLevel, ExamDateKey> = {
  A1: 'torfl.examDate',
  A2: 'torfl.examDateA2',
  B1: 'torfl.examDateB1',
  B2: 'torfl.examDateB2',
  C1: 'torfl.examDateC1',
};

function build(level: ExamLevel): ExamLevelProfile {
  const shape = UKR_STATE_SHAPES[level];
  const m = MODELLED[level];
  return {
    level,
    nameUk: `Рівень ${level}`,
    nameEn: `Level ${level}`,
    chipLabel: `Іспит · ${level}`,
    passPct: shape.pass.totalPct,
    modelled: shape.modelled,
    sections: shape.sections,
    pace: {
      lexgram: LEXGRAM_PACE_SEC,
      reading: paceOf(level, 'reading'),
      listening: paceOf(level, 'listening'),
    },
    speakingCapMs: m.cap,
    monologueDefaults: m.mono,
    monologueSentences: phrases(level),
    fluencyBands: m.wpm,
    aiStandard: `HONEST ${level} (державний іспит${shape.modelled ? ', за зразком' : ''})`,
    examDateKey: DATE_KEYS[level],
    category: `ukr-exam-${level.toLowerCase() as 'a1'}`,
    achievements: achievementIdsFor(level),
  };
}

export const UKR_PROFILES: Readonly<Record<ExamLevel, ExamLevelProfile>> = {
  A1: build('A1'),
  A2: build('A2'),
  B1: build('B1'),
  B2: build('B2'),
  C1: build('C1'),
};
/** Sumrak name, same table. */
export const TORFL_PROFILES = UKR_PROFILES;

export function isTorflLevel(value: unknown): value is ExamLevel {
  return typeof value === 'string' && (EXAM_LEVELS as readonly string[]).includes(value);
}
export const isExamLevel = isTorflLevel;

/** A level string (an exam's / pack's `level`, a route param) → its level; unknown → A1. */
export function torflLevelOf(level: string | null | undefined): ExamLevel {
  return isTorflLevel(level) ? level : 'A1';
}

/** The profile row for a level; unknown / missing → A1. */
export function profileFor(level: string | null | undefined): ExamLevelProfile {
  return UKR_PROFILES[torflLevelOf(level)];
}

/**
 * A `?level=` route param → a level or null. Expo Router hands a string, an
 * array (repeated param) or undefined; the first value counts, case-insensitive,
 * Cyrillic «А/В/С» tolerated (the Latin/Cyrillic look-alikes of A1 B1 B2 C1).
 */
export function levelParamOrNull(param: string | readonly string[] | undefined): ExamLevel | null {
  const raw = Array.isArray(param) ? param[0] : param;
  if (typeof raw !== 'string') return null;
  const norm = raw.trim().toUpperCase().replace('А', 'A').replace('В', 'B').replace('С', 'C');
  return isTorflLevel(norm) ? norm : null;
}

/** The `?level=` param → a level; missing / unknown → A1. */
export function levelFromParam(param: string | readonly string[] | undefined): ExamLevel {
  return levelParamOrNull(param) ?? 'A1';
}

/** Library category slug → its level (`ukr-exam-b1` → B1); other categories → null. */
export function levelForCategory(category: string | null | undefined): ExamLevel | null {
  for (const level of EXAM_LEVELS) {
    if (UKR_PROFILES[level].category === category) return level;
  }
  return null;
}

/** True for every «Іспит» shelf. */
export function isTorflCategory(category: string | null | undefined): boolean {
  return levelForCategory(category) !== null;
}

// --- copy (one place builds every level-specific line) ------------------------------

/** The relative-signal note on the readiness card. */
export const RELATIVE_NOTE = 'Орієнтир, не офіційна оцінка';
/** Badge on modelled mocks (A1/A2) — never imply an official paper. */
export const MODELLED_BADGE = 'за зразком державного іспиту';

/** «Поріг: 70 %». */
export function thresholdLine(level: ExamLevel): string {
  return `Поріг: ${UKR_PROFILES[level].passPct} %`;
}

/** Hub header subtitle. */
export function hubSubtitle(level: ExamLevel): string {
  const p = UKR_PROFILES[level];
  return p.modelled
    ? `${p.nameUk} · державна мова, ${MODELLED_BADGE}`
    : `${p.nameUk} · іспит з державної мови`;
}

/** Library hub-card title: «Іспит · B1 · Рівень B1». */
export function hubCardTitle(level: ExamLevel): string {
  const p = UKR_PROFILES[level];
  return `${p.chipLabel} · ${p.nameUk}`;
}

const SECONDS = ['секунда', 'секунди', 'секунд'] as const;
const TASKS = ['завдання', 'завдання', 'завдань'] as const;

/** The hub's quick-round row caption: «20 завдань у темпі тренування — 30 секунд на завдання». */
export function lightningCaption(level: ExamLevel, items = 20): string {
  const s = UKR_PROFILES[level].pace.lexgram;
  return `${items} ${pluralUk(items, TASKS)} у швидкому темпі — ${s} ${pluralUk(s, SECONDS)} на завдання`;
}

/** The quick-round end-screen pace note. */
export function lightningPaceNote(level: ExamLevel): string {
  return `Темп тренування — ${UKR_PROFILES[level].pace.lexgram} с на завдання.`;
}

/** Section kinds of a level's mock, in order (tabs, readiness rows). */
export function sectionKindsOf(level: ExamLevel): ExamSubtestKind[] {
  return UKR_PROFILES[level].sections.map((s) => s.kind);
}
