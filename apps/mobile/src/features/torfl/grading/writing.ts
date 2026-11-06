import type { WritingItem } from '@sutinki/schema';

import { matchesPattern, normalizeAnswer, roundPct, type ItemScore } from '../scoring';
import type { ExamCriterion } from '../model';
import {
  WRITING_RUBRICS,
  WRITING_TASK_POINTS,
  aiOnlyIdsOf,
  anyCriterionLabel,
  offlineMaxOf,
  type RubricCriterion,
  type WritingKind,
} from './rubrics';

/**
 * The offline (provisional) writing grader (UT17b, UKR_EXAM_PREP §2 Письмо rubrics via `rubrics.ts`) — PURE.
 * Scores the criteria a machine can judge without a model:
 *
 *   зміст   `content`  bullet points covered (cue stem globs over normalized tokens)
 *   форма   `form`     a greeting / sign-off (message) or paragraphs (text)
 *   обсяг   `volume`   the word limit of the task
 *
 * …and leaves the language criteria (нормативність, логічність, багатство, відповідність умові) to the AI rubric
 * or the «Самоперевірка». The offline points are RESCALED to a provisional 0–100 % so the results card can show
 * a number straight after «Здати»; the AI later supplies the full 100 (Σ max = 100 per response, the Commission's
 * per-task point split rescaled — see `rubrics.ts`). Honest, explainable numbers: "what the machine could
 * check", never the exam's opinion.
 */

export type { WritingKind } from './rubrics';

/** Writing task kind: task 45-style («text») vs task 44-style («message»). */
export function writingKindOf(item: Pick<WritingItem, 'topic' | 'minWords'>): WritingKind {
  if (item.topic === 'wr-text') return 'text';
  if (item.topic === 'wr-message') return 'message';
  return (item.minWords ?? 0) >= 50 ? 'text' : 'message';
}

export function writingRubric(kind: WritingKind): readonly RubricCriterion[] {
  return WRITING_RUBRICS[kind];
}
export function writingTaskPoints(kind: WritingKind): number {
  return WRITING_TASK_POINTS[kind];
}

export function criterionLabel(id: string, _topic?: string): { uk: string; en: string } {
  return anyCriterionLabel(id);
}

// --- text analysis -----------------------------------------------------------------------

/** A sentence terminator run: `.`, `!`, `?`, `…`, `...` — any mix, any length. */
const TERMINATOR = /[.!?…]+/g;
const HAS_WORD = /[\p{L}\p{N}]/u;

export interface SentenceSplit {
  /** Sentences with at least one letter/digit, in order, trimmed. */
  sentences: string[];
  /** Sentences whose terminator contains `?`. */
  questions: number;
}

/**
 * Split on `.!?…` runs (newlines also end a sentence when the line has no
 * terminator — people write greetings on their own line). A fragment with
 * no letter or digit is not a sentence; a terminator run containing «?» makes
 * its sentence a question («Как дела?!» counts once).
 */
export function sentenceSplit(text: string): SentenceSplit {
  const sentences: string[] = [];
  let questions = 0;
  for (const line of text.normalize('NFC').split(/\r?\n/)) {
    let last = 0;
    TERMINATOR.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TERMINATOR.exec(line)) !== null) {
      const body = line.slice(last, m.index).trim();
      last = m.index + m[0].length;
      if (!HAS_WORD.test(body)) continue;
      sentences.push(body);
      if (m[0].includes('?')) questions += 1;
    }
    const tail = line.slice(last).trim();
    if (HAS_WORD.test(tail)) sentences.push(tail);
  }
  return { sentences, questions };
}

export function countQuestions(text: string): number {
  return sentenceSplit(text).questions;
}

/** The normalized word tokens of a letter (hyphenated words stay whole). */
export function letterTokens(text: string): string[] {
  const norm = normalizeAnswer(text);
  return norm.length === 0 ? [] : norm.split(' ');
}

export interface BulletCoverage {
  covered: string[];
  missing: string[];
  total: number;
}

/**
 * A bullet counts as covered when ANY of its cues matches: a one-word cue
 * matches a token (exact or trailing-`*` stem glob, via `matchesPattern`); a
 * multi-word cue matches the normalized text as a phrase (same glob rule on
 * its last word).
 */
export function bulletCoverage(
  text: string,
  bullets: readonly Pick<WritingItem['bullets'][number], 'id' | 'cues'>[],
): BulletCoverage {
  const tokens = letterTokens(text);
  const joined = ` ${tokens.join(' ')} `;
  const covered: string[] = [];
  const missing: string[] = [];
  for (const b of bullets) {
    const hit = b.cues.some((cue) => cueMatches(cue, tokens, joined));
    (hit ? covered : missing).push(b.id);
  }
  return { covered, missing, total: bullets.length };
}

function cueMatches(cue: string, tokens: readonly string[], joined: string): boolean {
  const trimmed = cue.trim();
  if (trimmed.length === 0) return false;
  const glob = trimmed.endsWith('*');
  const words = normalizeAnswer(glob ? trimmed.slice(0, -1) : trimmed)
    .split(' ')
    .filter(Boolean);
  if (words.length === 0) return false;
  if (words.length === 1) return tokens.some((t) => matchesPattern(trimmed, t));
  const phrase = ` ${words.join(' ')}`;
  if (!glob) return joined.includes(`${phrase} `);
  return joined.includes(phrase);
}

const GREETING =
  /^(вітаю|привіт|добрий\s+(день|вечір|ранок)|доброго\s+(дня|ранку|вечора)|здрастуй|здрастуйте|шановн|дорог|любий|люба|вітання)/u;
const SIGN_OFF =
  /(^|\s)(бувай|бувайте|до\s+побачення|до\s+зустрічі|до\s+скорого|твій|твоя|ваш|ваша|цілую|обіймаю|з\s+повагою|з\s+любов'ю|з\s+любовʼю|чекаю\s+на\s+відповідь|щиро|усього\s+найкращого|всього\s+найкращого|на\s+все\s+добре|гарного\s+дня|на\s+зв'язку|на\s+звʼязку)(\s|$)/u;
/** How far from the end (in normalized characters) a sign-off may sit. */
const SIGN_OFF_WINDOW = 160;

export interface LetterForm {
  greeting: boolean;
  signOff: boolean;
}

/**
 * Greeting = the first non-empty line starts with a greeting word; sign-off
 * = one of the farewell formulas appears in the last ~160 normalized
 * characters.
 */
export function letterForm(text: string): LetterForm {
  const lines = text
    .normalize('NFC')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const first = normalizeAnswer(lines[0] ?? '');
  const greeting = GREETING.test(first);
  const norm = normalizeAnswer(text);
  const tail = norm.slice(Math.max(0, norm.length - SIGN_OFF_WINDOW));
  const signOff = SIGN_OFF.test(tail);
  return { greeting, signOff };
}

/** Non-empty lines (paragraph proxy for the «text» form criterion). */
export function paragraphCount(text: string): number {
  return text
    .normalize('NFC')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0).length;
}

// --- the grade -------------------------------------------------------------------------------

export interface OfflineWritingDetails {
  kind: WritingKind;
  sentences: number;
  questions: number;
  words: number;
  pointsCovered: number;
  pointsTotal: number;
  coveredIds: string[];
  missingIds: string[];
  greeting: boolean;
  signOff: boolean;
  paragraphs: number;
  minSentences: number;
  minQuestions: number;
  maxQuestions: number | null;
  minWords: number | null;
  maxWords: number | null;
}

export interface OfflineWritingGrade {
  kind: WritingKind;
  criteria: ExamCriterion[];
  /** Σ over the offline criteria. */
  offlinePoints: number;
  offlineMax: number;
  /** `offlinePoints / offlineMax × 100`, one decimal. */
  pct: number;
  provisional: true;
  details: OfflineWritingDetails;
}

function half(n: number): number {
  return Math.round(n * 2) / 2;
}

/** Volume share 0..1: inside [min, max] full; below min proportional; far above max (> +25 %) half. */
export function volumeShare(
  words: number,
  limits: {
    minWords: number | null;
    maxWords: number | null;
    minSentences: number;
    sentences: number;
  },
): number {
  if (words === 0) return 0;
  const { minWords, maxWords } = limits;
  if (minWords === null && maxWords === null) {
    return Math.min(1, limits.sentences / Math.max(1, limits.minSentences));
  }
  if (minWords !== null && words < minWords) return words / minWords;
  if (maxWords !== null && words > maxWords) return words <= maxWords * 1.25 ? 1 : 0.5;
  return 1;
}

/**
 * Grade a text offline. Partial credit is linear and rounded to halves:
 * content = covered / total bullets; form = (message) a greeting OR a sign-off earns the whole row, (text)
 * paragraphs ≥ 2 (a single block earns half when it is ≥ 3 sentences); volume per `volumeShare`. An empty
 * text scores 0 everywhere.
 */
export function gradeWritingOffline(
  item: Pick<WritingItem, 'bullets' | 'minSentences' | 'minQuestions' | 'maxQuestions'> & {
    topic?: string;
    minWords?: number;
    maxWords?: number;
  },
  text: string,
): OfflineWritingGrade {
  const kind = writingKindOf({ topic: item.topic ?? '', minWords: item.minWords });
  const rubric = WRITING_RUBRICS[kind];
  const max = (id: string) => rubric.find((c) => c.id === id)!.max;
  const split = sentenceSplit(text);
  const coverage = bulletCoverage(text, item.bullets);
  const form = letterForm(text);
  const words = letterTokens(text).length;
  const paragraphs = paragraphCount(text);
  const empty = split.sentences.length === 0;

  const content = empty
    ? 0
    : coverage.total > 0
      ? half((coverage.covered.length / coverage.total) * max('content'))
      : 0;
  const formShare = empty
    ? 0
    : kind === 'message'
      ? form.greeting || form.signOff
        ? 1
        : 0
      : paragraphs >= 2
        ? 1
        : split.sentences.length >= 3
          ? 0.5
          : 0;
  const volume = half(
    volumeShare(words, {
      minWords: item.minWords ?? null,
      maxWords: item.maxWords ?? null,
      minSentences: item.minSentences,
      sentences: split.sentences.length,
    }) * max('volume'),
  );
  const criteria: ExamCriterion[] = [
    { id: 'content', score: content, max: max('content') },
    { id: 'form', score: half(formShare * max('form')), max: max('form') },
    { id: 'volume', score: volume, max: max('volume') },
  ];
  const offlinePoints = criteria.reduce((n, c) => n + c.score, 0);
  const offlineMax = offlineMaxOf(rubric);
  return {
    kind,
    criteria,
    offlinePoints,
    offlineMax,
    pct: roundPct((offlinePoints / offlineMax) * 100),
    provisional: true,
    details: {
      kind,
      sentences: split.sentences.length,
      questions: split.questions,
      words,
      pointsCovered: coverage.covered.length,
      pointsTotal: coverage.total,
      coveredIds: coverage.covered,
      missingIds: coverage.missing,
      greeting: form.greeting,
      signOff: form.signOff,
      paragraphs,
      minSentences: item.minSentences,
      minQuestions: item.minQuestions,
      maxQuestions: item.maxQuestions ?? null,
      minWords: item.minWords ?? null,
      maxWords: item.maxWords ?? null,
    },
  };
}

/** The response-row points of a provisional grade over a response worth `maxPoints`. */
export function offlineItemScore(grade: OfflineWritingGrade, maxPoints: number): ItemScore {
  return {
    points: Math.round((grade.pct / 100) * maxPoints * 10) / 10,
    maxPoints,
    outcome: grade.pct >= 100 ? 'full' : grade.pct > 0 ? 'half' : 'wrong',
  };
}

/**
 * The percent a full criteria set (AI or self: Σ max = 100) is worth: Σ score / Σ max × 100, one decimal.
 * Tolerates a partial set by using its own Σ max as the denominator.
 */
export function criteriaPercent(criteria: readonly ExamCriterion[]): number {
  const max = criteria.reduce((n, c) => n + c.max, 0);
  if (max <= 0) return 0;
  const score = criteria.reduce((n, c) => n + Math.min(c.max, Math.max(0, c.score)), 0);
  return Math.min(100, roundPct((score / max) * 100));
}

// --- «Самоперевірка» ------------------------------------------------------------------------------

export interface SelfCheck {
  id: string;
  criterion: string;
  max: number;
  uk: string;
  en: string;
}
export type SelfCheckId = string;
export type SelfCheckValue = 0 | 0.5 | 1;

const SELF_TEXT: Record<string, { uk: string; en: string }> = {
  'norms-forms': {
    uk: 'Закінчення, відмінки й узгодження: як в зразку',
    en: 'Endings, cases & agreement match the model',
  },
  'norms-verbs': {
    uk: 'Дієслова, час і порядок слів: як в зразку',
    en: 'Verbs, tense & word order match the model',
  },
  fit: {
    uk: 'Текст відповідає темі й жанру завдання',
    en: 'The text answers the theme and genre of the task',
  },
  coherence: {
    uk: 'Думки йдуть послідовно, є сполучники, немає суперечностей',
    en: 'Ideas follow in order, connectors link them, no contradictions',
  },
  richness: {
    uk: 'Слова й конструкції різноманітні, не повторюються',
    en: 'Varied words and structures, no heavy repetition',
  },
};

/**
 * The self-check questions of a writing kind: one per AI-only criterion (the language norms criterion is split
 * into two halves: forms · verbs). Each answer is 0 / ½ / 1 of its points; Σ max = Σ AI-only max.
 */
export function selfChecksFor(kind: WritingKind): SelfCheck[] {
  const out: SelfCheck[] = [];
  for (const c of WRITING_RUBRICS[kind].filter((x) => !x.offline)) {
    if (c.id === 'norms') {
      const a = Math.ceil(c.max / 2);
      out.push({ id: 'norms-forms', criterion: 'norms', max: a, ...SELF_TEXT['norms-forms']! });
      out.push({
        id: 'norms-verbs',
        criterion: 'norms',
        max: c.max - a,
        ...SELF_TEXT['norms-verbs']!,
      });
    } else {
      out.push({ id: c.id, criterion: c.id, max: c.max, ...SELF_TEXT[c.id]! });
    }
  }
  return out;
}

export function aiOnlyIds(kind: WritingKind): string[] {
  return aiOnlyIdsOf(WRITING_RUBRICS[kind]);
}

/**
 * Fold the answers into the AI-only criteria and merge them with the offline criteria into a full
 * criteria set (Σ max = 100).
 */
export function selfCheckCriteria(
  offline: readonly ExamCriterion[],
  answers: Record<SelfCheckId, SelfCheckValue>,
  kind: WritingKind,
): ExamCriterion[] {
  const byCriterion = new Map<string, number>();
  for (const check of selfChecksFor(kind)) {
    const v = answers[check.id] ?? 0;
    byCriterion.set(check.criterion, (byCriterion.get(check.criterion) ?? 0) + v * check.max);
  }
  return WRITING_RUBRICS[kind].map((c) => {
    if (!c.offline) return { id: c.id, score: half(byCriterion.get(c.id) ?? 0), max: c.max };
    const off = offline.find((o) => o.id === c.id);
    return { id: c.id, score: off?.score ?? 0, max: c.max };
  });
}
