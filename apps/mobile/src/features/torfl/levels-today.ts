import { EXAM_LEVELS, type TorflLevel } from './level-profile';

/**
 * The exam-level ordering for the Today rows and the daily `torfl` segment
 * (T75, re-targeted by UT16b) — PURE. THE LEVEL RULE: every level-scoped
 * surface takes its level from here, never from a hard-coded A1.
 */

/** Exam dates per level ('YYYY-MM-DD' | null). */
export type ExamDates = Partial<Record<TorflLevel, string | null>>;

/**
 * A level is ACTIVE on Today (TORFL_A2 §3) when its exam date is set OR its deck has due items.
 */
export function isLevelActive(date: string | null | undefined, deckDue: number): boolean {
  return (date ?? null) !== null || deckDue > 0;
}

/**
 * Order the levels for the daily segment and the Today rows (TORFL_A2 §3, §8, Mitch 2026-10-09):
 * levels WITH a date first, nearest date first (a past date counts as nearest — it's overdue);
 * ties and levels without a date keep the fixed order A1 → A2 → B1 → B2 → C1.
 */
export function levelOrder(dates: ExamDates): TorflLevel[] {
  const dated = EXAM_LEVELS.filter((l) => (dates[l] ?? null) !== null);
  const undated = EXAM_LEVELS.filter((l) => (dates[l] ?? null) === null);
  // Array.prototype.sort is stable, so equal dates keep the A1 → A2 order.
  dated.sort((a, b) => (dates[a]! < dates[b]! ? -1 : dates[a]! > dates[b]! ? 1 : 0));
  return [...dated, ...undated];
}

/** The daily `torfl` segment's default (auto) state: on iff ANY level has an exam date. */
export function anyExamDate(dates: ExamDates): boolean {
  return EXAM_LEVELS.some((l) => (dates[l] ?? null) !== null);
}
