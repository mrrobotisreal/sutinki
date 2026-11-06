import type { ExamSubtestKind } from '@sutinki/schema';

/**
 * The `ukr-exam` drill-topic taxonomy (UT16, UKR_EXAM_PREP §4) — DATA FOR THE
 * VALIDATE REPORT ONLY (the topic census flags unknown slugs with `?`). The
 * app's label table is `apps/mobile/src/features/torfl/topics.ts`; packs carry
 * slugs, and an unknown slug is a warning, never an error (forward
 * compatibility).
 *
 * Two families: per-subtest SKILL slugs (below) and the 12 THEME slugs
 * (Standard Catalogue Б, A1 3.1–3.12 [std §2.4.1.3]) which are valid under any
 * subtest kind. Lexical-grammar study packs (`ukr-exam:lexgram`, study-only —
 * the real exam has no lexgram part) use the grammar slugs `g01…g38`
 * (= the grammar ids of `uk-a1-grammar.md`).
 */
export const EXAM_GRAMMAR_SLUGS: readonly string[] = Array.from(
  { length: 38 },
  (_, i) => `g${String(i + 1).padStart(2, '0')}`,
);

export const EXAM_THEME_SLUGS = [
  'liudyna',
  'dim',
  'misto',
  'pobut',
  'diialnist',
  'dozvillia',
  'podorozhi',
  'kupivlia',
  'iidalnia',
  'zdorovia',
  'pryroda',
  'sviata',
] as const;

export const EXAM_TOPICS: Readonly<Record<ExamSubtestKind, readonly string[]>> = {
  lexgram: EXAM_GRAMMAR_SLUGS,
  reading: ['rd-heading', 'rd-tf', 'rd-qa', 'rd-gap-word', 'rd-gap-form', 'rd-detail'],
  listening: ['ls-mc3', 'ls-tf'],
  writing: ['wr-message', 'wr-text'],
  speaking: ['sp-photo', 'sp-monologue', 'sp-dialogue'],
};

/** Every known skill/grammar slug → its subtest kind (theme slugs are separate: any kind). */
export const EXAM_TOPIC_KIND: ReadonlyMap<string, ExamSubtestKind> = new Map(
  Object.entries(EXAM_TOPICS).flatMap(([kind, slugs]) =>
    slugs.map((slug) => [slug, kind as ExamSubtestKind] as const),
  ),
);

export const EXAM_THEME_SET: ReadonlySet<string> = new Set(EXAM_THEME_SLUGS);
