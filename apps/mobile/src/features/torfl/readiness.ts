import type { ExamSubtestKind } from '@sutinki/schema';

import { pluralUk } from '@/lib/uk-plural';

import { profileFor, sectionKindsOf, type ExamLevel } from './level-profile';
import type { ExamResults } from './model';
import { SUBTEST_ORDER } from './topics';

/**
 * Readiness (T70, re-targeted by UT16b) — PURE: what the hub's «Готовність»
 * bars, the Library hub card's mini-bars and «Сьогодні» are computed from.
 *
 * Per subtest kind, in this order:
 *  1. a finished full / single-subtest MOCK of that kind within the last
 *     {@link MOCK_WINDOW_DAYS} days → its latest pct (provisional allowed,
 *     labelled);
 *  2. else the DRILL ESTIMATE over the last 200 objective responses of that
 *     kind, shrunk toward 50 % when there are few: `(correct + 15) / (n + 30)
 *     × 100` (n = 0 → 50, so the estimate only exists once n ≥ 1);
 *  3. else unknown. Writing / speaking have no objective responses, so only
 *     a mock (UT17) ever fills them. Rows come from the level's shape
 *     sections (never a fixed five-kind list).
 */

export const MOCK_WINDOW_DAYS = 21;
export const DRILL_ESTIMATE_WINDOW = 200;
/** Shrinkage prior: 15 imaginary correct out of 30 = a 50 % prior worth 30 answers. */
export const SHRINK_CORRECT = 15;
export const SHRINK_N = 30;
const DAY_MS = 86_400_000;

/** Bands are relative to the level's threshold: «borderline» = within this many points below it, «margin» = this many above. */
export const BAND_SPAN = 10;

/** Bands around the level's pass threshold: red < t − 10 · amber [t − 10, t) · green [t, t + 10) · gold ≥ t + 10. */
export type ReadinessBand = 'fail' | 'borderline' | 'pass' | 'margin';

export function bandFor(pct: number, passPct: number = profileFor('B1').passPct): ReadinessBand {
  if (pct >= passPct + BAND_SPAN) return 'margin';
  if (pct >= passPct) return 'pass';
  if (pct >= passPct - BAND_SPAN) return 'borderline';
  return 'fail';
}

/** Theme-token class per band (tokens in `global.css`: danger · track-warm · success · gold). */
export const BAND_BAR_CLASS: Record<ReadinessBand, string> = {
  fail: 'bg-danger',
  borderline: 'bg-track-warm',
  pass: 'bg-success',
  margin: 'bg-gold',
};

/** Same hues for text, on the dark surface. */
export const BAND_TEXT_CLASS: Record<ReadinessBand, string> = {
  fail: 'text-danger',
  borderline: 'text-track-warm',
  pass: 'text-success',
  margin: 'text-gold',
};

export type ReadinessSource = 'mock' | 'estimate' | 'none';

export interface ReadinessRow {
  kind: ExamSubtestKind;
  pct: number | null;
  band: ReadinessBand | null;
  source: ReadinessSource;
  /** Mock results waiting on AI grading (writing / speaking offline-scored). */
  provisional: boolean;
  /** Days since the mock (0 = today); null unless `source === 'mock'`. */
  mockDaysAgo: number | null;
  /** Objective responses behind an estimate; 0 otherwise. */
  answered: number;
  /** The source line under the bar. */
  label: string;
}

/** The latest mock pct of one kind (output of {@link latestMockPcts}). */
export interface MockPct {
  pct: number;
  finishedAt: number;
  provisional: boolean;
}

export interface DrillAccuracy {
  answered: number;
  correct: number;
}

/** What {@link latestMockPcts} needs of an attempt (repos.exams.listAttempts). */
export interface MockAttemptLike {
  status: string;
  mode: string;
  finishedAt: number | null;
  results: ExamResults | null;
  state: { subtests: readonly { id: string; kind: ExamSubtestKind }[] } | null;
}

const KIND_SET = new Set<string>(SUBTEST_ORDER);
/** Section kinds that have objective responses (a drill estimate can exist). */
const OBJECTIVE_KINDS: ReadonlySet<ExamSubtestKind> = new Set(['reading', 'listening', 'lexgram']);

/**
 * Latest finished mock pct per subtest kind. The kind of a results entry
 * comes from the attempt's state cursors (subtest id → kind); an id that IS
 * a kind name is accepted when the state is unreadable. Attempts may be in
 * any order.
 */
export function latestMockPcts(
  attempts: readonly MockAttemptLike[],
): Partial<Record<ExamSubtestKind, MockPct>> {
  const out: Partial<Record<ExamSubtestKind, MockPct>> = {};
  for (const a of attempts) {
    if (a.status !== 'finished' || a.mode !== 'mock' || a.finishedAt === null || !a.results) {
      continue;
    }
    const kindOfId = new Map((a.state?.subtests ?? []).map((s) => [s.id, s.kind]));
    for (const [subtestId, result] of Object.entries(a.results)) {
      const kind = kindOfId.get(subtestId) ?? (KIND_SET.has(subtestId) ? subtestId : null);
      if (!kind) continue;
      const k = kind as ExamSubtestKind;
      const prev = out[k];
      if (!prev || a.finishedAt > prev.finishedAt) {
        out[k] = { pct: result.pct, finishedAt: a.finishedAt, provisional: result.provisional };
      }
    }
  }
  return out;
}

/** `(correct + 15) / (n + 30) × 100`, one decimal; null when there is no response at all. */
export function drillEstimate(acc: DrillAccuracy | undefined): number | null {
  if (!acc || acc.answered <= 0) return null;
  const est = ((acc.correct + SHRINK_CORRECT) / (acc.answered + SHRINK_N)) * 100;
  return Math.round(est * 10) / 10;
}

function daysAgoLabel(days: number): string {
  if (days <= 0) return 'пробний іспит сьогодні';
  if (days === 1) return 'пробний іспит учора';
  return `пробний іспит ${days} дн. тому`;
}

export interface ReadinessInput {
  /** The level whose sections give the rows and whose threshold colours them (default B1). */
  level?: ExamLevel;
  now: number;
  mocks: Partial<Record<ExamSubtestKind, MockPct>>;
  drills: Partial<Record<ExamSubtestKind, DrillAccuracy>>;
}

export function computeReadiness(input: ReadinessInput): ReadinessRow[] {
  const level = input.level ?? 'B1';
  const passPct = profileFor(level).passPct;
  return sectionKindsOf(level).map((kind): ReadinessRow => {
    const mock = input.mocks[kind];
    if (mock) {
      const days = Math.floor((input.now - mock.finishedAt) / DAY_MS);
      if (days <= MOCK_WINDOW_DAYS) {
        return {
          kind,
          pct: mock.pct,
          band: bandFor(mock.pct, passPct),
          source: 'mock',
          provisional: mock.provisional,
          mockDaysAgo: Math.max(0, days),
          answered: 0,
          label: `${daysAgoLabel(days)}${mock.provisional ? ' · попередньо' : ''}`,
        };
      }
    }
    const acc = input.drills[kind];
    const est = drillEstimate(acc);
    if (est !== null) {
      return {
        kind,
        pct: est,
        band: bandFor(est, passPct),
        source: 'estimate',
        provisional: false,
        mockDaysAgo: null,
        answered: acc!.answered,
        label: `оцінка за тренуваннями · ${acc!.answered} ${pluralUk(acc!.answered, ['відповідь', 'відповіді', 'відповідей'])}`,
      };
    }
    return {
      kind,
      pct: null,
      band: null,
      source: 'none',
      provisional: false,
      mockDaysAgo: null,
      answered: 0,
      label: OBJECTIVE_KINDS.has(kind)
        ? 'зʼявиться після першого тренування'
        : 'зʼявиться після пробного іспиту',
    };
  });
}

// --- «Сьогодні» --------------------------------------------------------------------

export interface TopicAccuracy {
  topic: string;
  answered: number;
  correct: number;
}

/** A topic needs this many answers before it can be called «the weakest». */
export const MIN_TOPIC_ANSWERS = 3;

/** Lowest-accuracy topic among `topics` with ≥ {@link MIN_TOPIC_ANSWERS} answers (ties → fewer answers, then slug). */
export function weakestTopic(
  stats: readonly TopicAccuracy[],
  topics: ReadonlySet<string>,
): TopicAccuracy | null {
  const candidates = stats.filter((s) => topics.has(s.topic) && s.answered >= MIN_TOPIC_ANSWERS);
  if (candidates.length === 0) return null;
  const acc = (s: TopicAccuracy) => s.correct / s.answered;
  return [...candidates].sort(
    (a, b) => acc(a) - acc(b) || a.answered - b.answered || a.topic.localeCompare(b.topic),
  )[0]!;
}

export type TodayStep =
  | { kind: 'topic'; subtestKind: ExamSubtestKind; topic: string; accuracy: number }
  | { kind: 'deck'; due: number }
  | { kind: 'mock' }
  | { kind: 'start'; subtestKind: ExamSubtestKind };

export interface TodayInput {
  rows: readonly ReadinessRow[];
  /** topic slugs per subtest kind that have a drill tile (the practisable set). */
  topicsByKind: Partial<Record<ExamSubtestKind, ReadonlySet<string>>>;
  topicStats: readonly TopicAccuracy[];
  deckDue: number;
  /** Latest finished mock of ANY kind (epoch ms), or null. */
  lastMockAt: number | null;
  now: number;
  /** Is a mock exam installed (the «time for a mock» step needs somewhere to go)? */
  mockInstalled: boolean;
  /** The level's pass threshold, % (default B1's 70). */
  passPct?: number;
}

/**
 * The recommended next step. Order:
 *  1. the weakest topic of the weakest objective section whose readiness is
 *     under the level's threshold (needs ≥ 3 answers in that topic);
 *  2. due deck items;
 *  3. «time for a mock»: no mock in 7 days and the objective sections all
 *     known and within 10 points of the threshold;
 *  4. otherwise the practisable topic with the lowest accuracy anywhere, else
 *     the first drill of the first subtest that has one; null with no drills.
 */
export function recommendToday(input: TodayInput): TodayStep | null {
  const { rows } = input;
  const passPct = input.passPct ?? profileFor('B1').passPct;
  const objective = rows.filter((r) => OBJECTIVE_KINDS.has(r.kind));
  const weakRows = [...objective]
    .filter((r) => r.pct !== null && r.pct < passPct)
    .sort((a, b) => a.pct! - b.pct!);
  for (const row of weakRows) {
    const topics = input.topicsByKind[row.kind];
    if (!topics) continue;
    const t = weakestTopic(input.topicStats, topics);
    if (t) {
      return {
        kind: 'topic',
        subtestKind: row.kind,
        topic: t.topic,
        accuracy: Math.round((t.correct / t.answered) * 100),
      };
    }
  }
  if (input.deckDue > 0) return { kind: 'deck', due: input.deckDue };
  const sevenDays = 7 * DAY_MS;
  const noRecentMock = input.lastMockAt === null || input.now - input.lastMockAt > sevenDays;
  const objectiveAllKnown = objective.length > 0 && objective.every((r) => r.pct !== null);
  if (
    input.mockInstalled &&
    noRecentMock &&
    objectiveAllKnown &&
    objective.every((r) => r.pct! >= passPct - BAND_SPAN)
  ) {
    return { kind: 'mock' };
  }
  const all = new Set<string>();
  for (const set of Object.values(input.topicsByKind)) for (const t of set ?? []) all.add(t);
  const any = weakestTopic(input.topicStats, all);
  if (any) {
    const kind = SUBTEST_ORDER.find((k) => input.topicsByKind[k]?.has(any.topic));
    if (kind) {
      return {
        kind: 'topic',
        subtestKind: kind,
        topic: any.topic,
        accuracy: Math.round((any.correct / any.answered) * 100),
      };
    }
  }
  const first = SUBTEST_ORDER.find((k) => (input.topicsByKind[k]?.size ?? 0) > 0);
  return first ? { kind: 'start', subtestKind: first } : null;
}
