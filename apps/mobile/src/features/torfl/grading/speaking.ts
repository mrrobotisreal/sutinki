import type {
  ExamItem,
  ExamSubtest,
  SpeakingMonologueItem,
  SpeakingTurnItem,
} from '@sutinki/schema';

import { judgeAnswer, type JudgeResult } from '@/features/scenario/judge/judge';
import { contentTokens } from '@/features/scenario/judge/slots';
import { scoringTokens } from '@/features/pronunciation/scoring';

import type { ExamCriterion, SpeakingAnswer, SpeakingWordStamp } from '../model';
import { profileFor } from '../level-profile';
import { roundPct } from '../scoring';
import { bulletCoverage } from './writing';
import {
  SPEAKING_RUBRICS,
  SPEAKING_TASK_POINTS,
  anyCriterionLabel,
  offlineMaxOf,
  type RubricCriterion,
  type SpeakingRubricKind,
} from './rubrics';
import { countVerbs } from './verbs-uk';

/**
 * The offline (provisional) speaking grader (UT17b, UKR_EXAM_PREP §2 Говоріння rubrics via `rubrics.ts`) — PURE.
 * Every speaking response is graded to a 0–100 rubric whose criterion ids the AI prompt pins (Σ max = 100):
 *
 *   photo (46)     content 29 · structure 42 · competence 29 (AI)
 *   monologue (47) content 40 · structure 20 · competence 40 (AI)
 *   dialogue (48)  content 29 · fullness 36 · accuracy 21 (AI) · norms 7 (AI) · range 7 (AI)
 *
 * The Commission's point split (4/6/4, 4/2/4, 4/3/5/1/1 of 14/10/14) rescaled to 100 — see `rubrics.ts`. The
 * offline parts: dialogue content = the M17 judge (matched → full, near-miss → half) and fullness = a FULL answer;
 * photo / monologue content = cue coverage, structure = the sentence estimate vs the asked phrases (70 %) and
 * fluency (30 %). The provisional percent RESCALES the offline-scorable points to 100; the AI later supplies the
 * full 100 through the kind-agnostic queue.
 *
 * Section arithmetic [reg20 IV.1]: photo 14 + monologue 10 + dialogue 14 = 38 points; a response's share is its
 * rubric kind's points split over the kind's slots (a monologue pair = ONE slot), scaled to the section's
 * `maxPoints` (A1/A2/B1 = 38).
 *
 * THE JUDGE IS M17's `judgeAnswer` (language `uk`). When a Whisper assist transcript exists, both transcripts are
 * judged and the better verdict wins — ASR mis-hearings should never cost a point the other recognizer would give.
 */

/** The engine's flow number: 1/2 = turn items (reply / situation), 3 = monologue flow (photo and monologue). */
export type SpeakingTask = 1 | 2 | 3;
export type { SpeakingRubricKind } from './rubrics';

export const SPEAKING_TURN_CRITERIA = SPEAKING_RUBRICS.dialogue;
export const SPEAKING_MONOLOGUE_CRITERIA = SPEAKING_RUBRICS.monologue;
export const SPEAKING_PHOTO_CRITERIA = SPEAKING_RUBRICS.photo;

/** The rubric kind of a speaking item (photo = a monologue item carrying an image). */
export function speakingRubricKind(
  item: Pick<ExamItem, 'kind'> & { image?: unknown },
): SpeakingRubricKind | null {
  switch (item.kind) {
    case 'speaking-reply':
    case 'speaking-situation':
      return 'dialogue';
    case 'speaking-monologue':
      return item.image ? 'photo' : 'monologue';
    default:
      return null;
  }
}

export function speakingCriteria(kind: SpeakingRubricKind): readonly RubricCriterion[] {
  return SPEAKING_RUBRICS[kind];
}

export function speakingCriterionLabel(id: string): { uk: string; en: string } {
  return anyCriterionLabel(id);
}

/** The official task number of a speaking item (by kind, never by part index). */
export function speakingTaskOf(item: Pick<ExamItem, 'kind'>): SpeakingTask | null {
  switch (item.kind) {
    case 'speaking-reply':
      return 1;
    case 'speaking-situation':
      return 2;
    case 'speaking-monologue':
      return 3;
    default:
      return null;
  }
}

export const KIND_LABEL: Record<SpeakingRubricKind, { uk: string; en: string }> = {
  photo: { uk: 'Опис фото', en: 'Photo description' },
  monologue: { uk: 'Монолог', en: 'Monologue' },
  dialogue: { uk: 'Діалог з екзаменатором', en: 'Dialogue with the examiner' },
};
export const TASK_LABEL: Record<SpeakingTask, { uk: string; en: string }> = {
  1: KIND_LABEL.dialogue,
  2: KIND_LABEL.dialogue,
  3: KIND_LABEL.monologue,
};
/** The label of a concrete item (photo vs monologue). */
export function itemTaskLabel(item: Pick<ExamItem, 'kind'> & { image?: unknown }): {
  uk: string;
  en: string;
} {
  const k = speakingRubricKind(item);
  return k ? KIND_LABEL[k] : KIND_LABEL.dialogue;
}

// --- shares -----------------------------------------------------------------------------------

/** The minimum a share computation needs: the items, grouped in parts. */
export interface SpeakingPartsLike {
  parts: readonly { items: readonly ExamItem[] }[];
  maxPoints: number;
}

/** Slots per rubric kind: items for dialogue/photo; distinct `group`s (or ungrouped items) for monologues. */
export function kindSlots(
  subtest: Pick<SpeakingPartsLike, 'parts'>,
): Record<SpeakingRubricKind, number> {
  const slots: Record<SpeakingRubricKind, number> = { photo: 0, monologue: 0, dialogue: 0 };
  const groups = new Set<string>();
  for (const item of subtest.parts.flatMap((p) => p.items)) {
    const kind = speakingRubricKind(item as never);
    if (kind === null) continue;
    if (kind === 'monologue' && item.kind === 'speaking-monologue') {
      groups.add(item.group ?? `item:${item.id}`);
    } else slots[kind] += 1;
  }
  slots.monologue = groups.size;
  return slots;
}

/**
 * The points one response is worth inside the section: the kind's Commission points (renormalized over the kinds
 * the section actually has) split equally over the kind's slots, in `maxPoints` units.
 */
export function responseShare(subtest: SpeakingPartsLike, item: Pick<ExamItem, 'kind'>): number {
  const kind = speakingRubricKind(item as never);
  if (kind === null) return 0;
  const slots = kindSlots(subtest);
  if (slots[kind] === 0) return 0;
  const present = (Object.keys(slots) as SpeakingRubricKind[]).filter((k) => slots[k] > 0);
  const total = present.reduce((n, k) => n + SPEAKING_TASK_POINTS[k], 0);
  const kindPoints = (SPEAKING_TASK_POINTS[kind] / total) * subtest.maxPoints;
  return Math.round((kindPoints / slots[kind]) * 1000) / 1000;
}

// --- transcript analysis -------------------------------------------------------------------------

/** A pause at least this long between two words ends a clause (§6.2; device-calibrated, recorded in the T73 row). */
export const PAUSE_CLAUSE_MS = 600;
/** The clause count may exceed the verb count by this much (an undetected verb is not a lost sentence). */
export const VERB_SLACK = 1;

export { looksLikeVerb, countVerbs } from './verbs-uk';

export interface SentenceEstimate {
  /** The final estimate (≥ 1 when anything was said). */
  sentences: number;
  /** Clauses split at pauses ≥ `pauseMs`. */
  clauses: number;
  verbs: number;
  words: number;
  /** Speech span = last word end − first word start (ms). */
  speechMs: number;
  longestPauseMs: number;
  wpm: number;
}

/**
 * ASR has no punctuation (§6.2 risk): sentences ≈ clauses split at pauses
 * ≥ 600 ms between consecutive words, capped by the verb count (+ slack).
 * Stamps absent → the clause count falls back to the verb count alone.
 */
export function estimateSentences(
  transcript: string,
  stamps: readonly SpeakingWordStamp[] | undefined,
  opts: { pauseMs?: number } = {},
): SentenceEstimate {
  const pauseMs = opts.pauseMs ?? PAUSE_CLAUSE_MS;
  const tokens = scoringTokens(transcript);
  const verbs = countVerbs(tokens);
  const words = tokens.length;
  if (words === 0) {
    return { sentences: 0, clauses: 0, verbs: 0, words: 0, speechMs: 0, longestPauseMs: 0, wpm: 0 };
  }
  let clauses = 1;
  let longestPauseMs = 0;
  let speechMs = 0;
  if (stamps && stamps.length > 1) {
    const sorted = [...stamps].sort((a, b) => a.s - b.s);
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i]!.s - sorted[i - 1]!.e;
      if (gap > longestPauseMs) longestPauseMs = gap;
      if (gap >= pauseMs) clauses += 1;
    }
    speechMs = Math.max(0, sorted[sorted.length - 1]!.e - sorted[0]!.s);
  } else if (stamps && stamps.length === 1) {
    speechMs = Math.max(0, stamps[0]!.e - stamps[0]!.s);
  }
  const cap = Math.max(1, verbs + VERB_SLACK);
  // Device finding (T73, S25): Zipformer stamps are CONTIGUOUS (each word's end = the next
  // word's start), so no pause is ever visible and `clauses` stays 1 — the verb count is then
  // the only signal. A pause-split only counts when the stamps actually show pauses.
  const sentences =
    stamps && stamps.length > 1 && clauses > 1 ? Math.min(clauses, cap) : Math.max(1, verbs);
  const wpm = speechMs > 0 ? Math.round((words / (speechMs / 60_000)) * 10) / 10 : 0;
  return { sentences, clauses, verbs, words, speechMs, longestPauseMs, wpm };
}

/** Fluency bands (modelled; the level profile overrides them). */
export const WPM_BANDS = { full: 70, good: 45, weak: 25 } as const;
export const PAUSE_BANDS_MS = { full: 2_000, half: 4_000 } as const;

/** 0..1 fluency share: 60 % words-per-minute band + 40 % longest-pause band. */
export function fluencyShare(
  est: Pick<SentenceEstimate, 'wpm' | 'longestPauseMs' | 'words'>,
  /** T76: the level profile's bands (A1 default = `WPM_BANDS`). */
  bands: { full: number; good: number; weak: number } = WPM_BANDS,
): number {
  if (est.words === 0) return 0;
  if (est.wpm === 0) return 0.5; // no stamps: neutral
  const wpmBand =
    est.wpm >= bands.full ? 1 : est.wpm >= bands.good ? 2 / 3 : est.wpm >= bands.weak ? 1 / 3 : 0;
  const pauseBand =
    est.longestPauseMs <= PAUSE_BANDS_MS.full
      ? 1
      : est.longestPauseMs <= PAUSE_BANDS_MS.half
        ? 0.5
        : 0;
  return 0.6 * wpmBand + 0.4 * pauseBand;
}

// --- the grades ----------------------------------------------------------------------------------

export interface OfflineTurnDetails {
  task: 1 | 2;
  rubric: 'dialogue';
  verdict: JudgeResult['verdict'];
  nearMiss: boolean;
  judgeScore: number;
  /** Which transcript the judge preferred. */
  transcriptUsed: 'primary' | 'assist';
  contentTokens: number;
  minTokens: number;
  fullAnswer: boolean;
  /** The judge's per-slot hits (the debrief chips). */
  slots: Record<string, string | null>;
  target: string;
}

export interface OfflineMonologueDetails {
  task: 3;
  rubric: 'photo' | 'monologue';
  covered: number;
  total: number;
  coveredIdx: number[];
  missingIdx: number[];
  sentences: number;
  minSentences: number;
  clauses: number;
  verbs: number;
  words: number;
  speechMs: number;
  longestPauseMs: number;
  wpm: number;
  transcriptUsed: 'primary' | 'assist';
}

export type OfflineSpeakingDetails = OfflineTurnDetails | OfflineMonologueDetails;

export interface OfflineSpeakingGrade {
  task: SpeakingTask;
  rubric: SpeakingRubricKind;
  criteria: ExamCriterion[];
  offlinePoints: number;
  offlineMax: number;
  /** `offlinePoints / offlineMax × 100`, one decimal. */
  pct: number;
  provisional: true;
  details: OfflineSpeakingDetails;
}

function half(n: number): number {
  return Math.round(n * 2) / 2;
}

const maxOf = (kind: SpeakingRubricKind, id: string) =>
  SPEAKING_RUBRICS[kind].find((c) => c.id === id)!.max;

/** `uk` judge context: Ukrainian stop-words, numerals and stems (ADR-0004 fold). */
const JUDGE_CTX = { language: 'uk' } as const;

/**
 * The content-token count a FULL answer needs: the item's `minTokens` (schema default 4) counted against the
 * stop-word list is calibrated to the model answer: `min(minTokens, contentTokens(accept[0]))`, never below 1.
 * «так» / «ні» / «не знаю» stay below it.
 */
export function fullAnswerThreshold(item: Pick<SpeakingTurnItem, 'expect' | 'minTokens'>): number {
  const model = contentTokens(scoringTokens(item.expect.accept[0] ?? ''), 'uk').length;
  return Math.max(1, model > 0 ? Math.min(item.minTokens, model) : item.minTokens);
}

/** The better of two judge results: verdict first (matched > near-miss > miss), then score. */
function better(a: JudgeResult, b: JudgeResult): boolean {
  const rank = (r: JudgeResult) =>
    r.verdict === 'matched' ? 2 : r.nearMiss ? 1 : r.verdict === 'miss' ? 0 : -1;
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra > rb;
  return a.score > b.score;
}

/** Dialogue (task 48 replies): content = judge (matched full / near-miss half), fullness = a FULL answer. */
export function gradeTurnOffline(
  item: Pick<SpeakingTurnItem, 'kind' | 'expect' | 'minTokens'>,
  answer: Pick<SpeakingAnswer, 'transcript' | 'assistTranscript'>,
): OfflineSpeakingGrade {
  const task: 1 | 2 = item.kind === 'speaking-reply' ? 1 : 2;
  const primary = judgeAnswer(answer.transcript, item.expect, JUDGE_CTX);
  let used: 'primary' | 'assist' = 'primary';
  let judge = primary;
  if (answer.assistTranscript && answer.assistTranscript.trim().length > 0) {
    const assist = judgeAnswer(answer.assistTranscript, item.expect, JUDGE_CTX);
    if (better(assist, primary)) {
      judge = assist;
      used = 'assist';
    }
  }
  const transcript = used === 'assist' ? answer.assistTranscript! : answer.transcript;
  const content = contentTokens(scoringTokens(transcript), 'uk').length;
  const contentMax = maxOf('dialogue', 'content');
  const response =
    judge.verdict === 'matched' ? contentMax : judge.nearMiss ? half(contentMax / 2) : 0;
  const threshold = fullAnswerThreshold(item);
  const fullAnswer = judge.verdict !== 'no-speech' && content >= threshold;
  const fullness = fullAnswer ? maxOf('dialogue', 'fullness') : 0;
  const criteria: ExamCriterion[] = [
    { id: 'content', score: response, max: contentMax },
    { id: 'fullness', score: fullness, max: maxOf('dialogue', 'fullness') },
  ];
  const offlinePoints = response + fullness;
  const offlineMax = offlineMaxOf(SPEAKING_RUBRICS.dialogue);
  return {
    task,
    rubric: 'dialogue',
    criteria,
    offlinePoints,
    offlineMax,
    pct: roundPct((offlinePoints / offlineMax) * 100),
    provisional: true,
    details: {
      task,
      rubric: 'dialogue',
      verdict: judge.verdict,
      nearMiss: judge.nearMiss,
      judgeScore: judge.score,
      transcriptUsed: used,
      contentTokens: content,
      minTokens: threshold,
      fullAnswer,
      slots: judge.slots,
      target: judge.target,
    },
  };
}

/**
 * Photo (46) and monologue (47): content = cue coverage of the item's questions / details, structure = the
 * sentence estimate vs the asked phrases (70 %) + fluency (30 %); competence is AI-only.
 */
export function gradeMonologueOffline(
  item: Pick<SpeakingMonologueItem, 'questions' | 'minSentences'> & { image?: unknown },
  answer: Pick<SpeakingAnswer, 'transcript' | 'assistTranscript' | 'words'>,
  opts: { pauseMs?: number; level?: string | null } = {},
): OfflineSpeakingGrade {
  const rubric: 'photo' | 'monologue' = item.image ? 'photo' : 'monologue';
  const bullets = item.questions.map((q, i) => ({ id: `q${i}`, cues: q.cues }));
  const primaryCov = bulletCoverage(answer.transcript, bullets);
  let coverage = primaryCov;
  let used: 'primary' | 'assist' = 'primary';
  if (answer.assistTranscript && answer.assistTranscript.trim().length > 0) {
    const assistCov = bulletCoverage(answer.assistTranscript, bullets);
    if (assistCov.covered.length > primaryCov.covered.length) {
      coverage = assistCov;
      used = 'assist';
    }
  }
  const est = estimateSentences(answer.transcript, answer.words, opts);
  const empty = est.words === 0 && !(answer.assistTranscript ?? '').trim();
  const contentMax = maxOf(rubric, 'content');
  const structMax = maxOf(rubric, 'structure');
  const contentScore = empty
    ? 0
    : coverage.total > 0
      ? half((coverage.covered.length / coverage.total) * contentMax)
      : 0;
  const lengthShare = Math.min(1, est.sentences / Math.max(1, item.minSentences));
  const fluency = fluencyShare(est, profileFor(opts.level).fluencyBands);
  const structureScore = empty ? 0 : half((0.7 * lengthShare + 0.3 * fluency) * structMax);
  const criteria: ExamCriterion[] = [
    { id: 'content', score: contentScore, max: contentMax },
    { id: 'structure', score: structureScore, max: structMax },
  ];
  const offlinePoints = contentScore + structureScore;
  const offlineMax = offlineMaxOf(SPEAKING_RUBRICS[rubric]);
  const idx = (ids: string[]) => ids.map((id) => Number(id.slice(1)));
  return {
    task: 3,
    rubric,
    criteria,
    offlinePoints,
    offlineMax,
    pct: roundPct((offlinePoints / offlineMax) * 100),
    provisional: true,
    details: {
      task: 3,
      rubric,
      covered: coverage.covered.length,
      total: coverage.total,
      coveredIdx: idx(coverage.covered),
      missingIdx: idx(coverage.missing),
      sentences: est.sentences,
      minSentences: item.minSentences,
      clauses: est.clauses,
      verbs: est.verbs,
      words: est.words,
      speechMs: est.speechMs,
      longestPauseMs: est.longestPauseMs,
      wpm: est.wpm,
      transcriptUsed: used,
    },
  };
}

/** Grade any speaking item offline; null for a non-speaking item. */
export function gradeSpeakingOffline(
  item: ExamItem,
  answer: SpeakingAnswer | undefined,
  opts: { pauseMs?: number; level?: string | null } = {},
): OfflineSpeakingGrade | null {
  const blank: SpeakingAnswer = {
    kind:
      item.kind === 'speaking-monologue'
        ? 'speaking-monologue'
        : item.kind === 'speaking-situation'
          ? 'speaking-situation'
          : 'speaking-reply',
    transcript: '',
    recordingPath: null,
    durationMs: 0,
  };
  const a = answer ?? blank;
  if (item.kind === 'speaking-reply' || item.kind === 'speaking-situation') {
    return gradeTurnOffline(item, a);
  }
  if (item.kind === 'speaking-monologue') return gradeMonologueOffline(item, a, opts);
  return null;
}

/** Response-row points of a provisional grade worth `share` points of the section. */
export function offlineSpeakingPoints(grade: OfflineSpeakingGrade, share: number): number {
  return Math.round((grade.pct / 100) * share * 10) / 10;
}

/**
 * The section's provisional result from the stored speaking answers (the `computeFinish` path): Σ over answered
 * items of pct × share; items with no answer (skipped, the unchosen monologue) contribute 0.
 */
export function scoreSpeakingSubtest(
  subtest: ExamSubtest,
  answers: Record<string, { kind: string } & Partial<SpeakingAnswer>>,
  level?: string | null,
): { points: number; maxPoints: number; pct: number } {
  let points = 0;
  for (const item of subtest.parts.flatMap((p) => p.items)) {
    if (speakingTaskOf(item) === null) continue;
    const a = answers[item.id];
    if (!a || typeof a.transcript !== 'string') continue;
    const grade = gradeSpeakingOffline(item, a as SpeakingAnswer, { level });
    if (!grade) continue;
    points += offlineSpeakingPoints(grade, responseShare(subtest, item));
  }
  points = Math.round(points * 10) / 10;
  return {
    points,
    maxPoints: subtest.maxPoints,
    pct:
      subtest.maxPoints > 0
        ? Math.min(100, Math.max(0, roundPct((points / subtest.maxPoints) * 100)))
        : 0,
  };
}

/** The percent a full criteria set is worth (Σ score / Σ max). */
export function speakingCriteriaPercent(criteria: readonly ExamCriterion[]): number {
  const max = criteria.reduce((n, c) => n + c.max, 0);
  if (max <= 0) return 0;
  const score = criteria.reduce((n, c) => n + Math.min(c.max, Math.max(0, c.score)), 0);
  return Math.min(100, roundPct((score / max) * 100));
}
