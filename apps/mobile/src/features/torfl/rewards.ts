import type { ExamSubtestKind } from '@sutinki/schema';

import { XP_TABLE } from '@/features/motivation/xp';

import type { ExamScope, ExamVerdict } from './model';
import {
  achievementIdsFor,
  sectionKindsOf,
  type TorflAchievementId,
  type TorflLevel,
} from './level-profile';

/**
 * Mock rewards (T71, re-targeted by UT16b) — PURE: how much XP a finished mock
 * earns and which achievements it unlocks. The motivation service applies them
 * (`recordExamFinished`); UT17's completion path calls the same function once a
 * four-section verdict exists, so the verdict-gated unlocks fire whenever the
 * first full verdict arrives.
 *
 * XP: 15 per SCORED section (a skipped placeholder earns nothing) + 60 for a
 * finished full mock + 100 the first time a verdict is pass /.
 *
 * Achievements (stable ids, never renamed; four per level `exam-<l>-…`):
 *  - `firstMock`  — any finished mock with a scored section;
 *  - `wouldPass`  — a full verdict of pass /;
 *  - `margin`     — a full verdict with every section of the level at 80 % or better;
 *  - `deck100`    — 100 exam-deck cards of the level in the FSRS Review state (swept by the
 *                   motivation service, not here).
 * The level comes from `input.level` (absent = A1).
 */

export const MARGIN_ALL_PCT = 80;

export interface ExamRewardInput {
  scope: ExamScope;
  /** The exam's level. Absent = A1 (back-compat). */
  level?: TorflLevel;
  /** Scored (non-skipped) sections of the attempt. */
  scoredSubtests: number;
  pcts: Partial<Record<ExamSubtestKind, number>>;
  /** Null until every section of the level has a score. */
  verdict: ExamVerdict | null;
  /** True when no earlier finished mock already had a pass / verdict. */
  firstPass: boolean;
}

export function examXp(input: ExamRewardInput): number {
  let xp = input.scoredSubtests * XP_TABLE.examSubtestFinished;
  if (input.scope === 'full' && input.scoredSubtests > 0) xp += XP_TABLE.examFullFinished;
  if (input.verdict === 'pass') {
    if (input.firstPass) xp += XP_TABLE.examFirstPass;
  }
  return xp;
}

export type ExamAchievementId = TorflAchievementId;

export function examAchievements(input: ExamRewardInput): ExamAchievementId[] {
  const ids = achievementIdsFor(input.level ?? 'A1');
  const out: ExamAchievementId[] = [];
  if (input.scoredSubtests > 0) out.push(ids.firstMock);
  if (input.verdict === 'pass') out.push(ids.wouldPass);
  if (input.verdict !== null) {
    const kinds = sectionKindsOf(input.level ?? 'A1');
    if (kinds.every((k) => (input.pcts[k] ?? 0) >= MARGIN_ALL_PCT)) out.push(ids.margin);
  }
  return out;
}
