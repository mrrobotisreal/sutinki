import type { Exam, ExamSubtest, WritingItem } from '@sutinki/schema';

import {
  bulletCoverage,
  sentenceSplit,
  writingKindOf,
  writingTaskPoints,
} from '../grading/writing';

/**
 * Pure derivations for the writing editor (T72, TORFL §8.3): the live
 * counters and the bullet checklist. Both the mock runner (counters only —
 * the exam lets candidates count) and the practice mode (counters + the
 * ticking checklist) read these.
 */

/**
 * The analytics `task` + `topic` of a writing item (T75, A2-12): `task` is
 * the 1-based position of the item among its subtest's writing items (parts
 * in order — A1's single letter → 1, A2's note → 2); `topic` is the item's
 * topic slug. Unknown item → `{ task: 0, topic: 'none' }`.
 */
export function writingTaskOf(
  exam: Exam,
  subtestId: string,
  itemId: string,
): { task: number; topic: string } {
  const subtest = exam.subtests.find((s) => s.id === subtestId);
  if (!subtest) return { task: 0, topic: 'none' };
  let position = 0;
  for (const part of subtest.parts) {
    for (const item of part.items) {
      if (item.kind !== 'writing') continue;
      position += 1;
      if (item.id === itemId) return { task: position, topic: item.topic };
    }
  }
  return { task: 0, topic: 'none' };
}

/** The writing items of a subtest, in order across its parts (A1: one letter; A2: letter + note). */
export function writingItemsOf(subtest: ExamSubtest): WritingItem[] {
  const out: WritingItem[] = [];
  for (const part of subtest.parts) {
    for (const item of part.items) if (item.kind === 'writing') out.push(item);
  }
  return out;
}

/**
 * The points one writing response is worth inside the section: the Commission's per-task points
 * (`WRITING_TASK_POINTS`: message 10, text 23 of 33 [reg20 IV.1]) renormalised over the section's writing items
 * and scaled to the section's `maxPoints` (33 at A1/A2/B1) — so a section % is exactly Σ points / 33. The ONE rule
 * behind both `use-exam-run` writes, `fold` (via the row's `maxPoints`) and `scoreWritingSubtest`.
 */
export function writingShare(
  subtest: Pick<ExamSubtest, 'maxPoints' | 'parts'>,
  item?: Pick<WritingItem, 'topic' | 'minWords'>,
): number {
  const items = writingItemsOf(subtest as ExamSubtest);
  if (items.length === 0) return subtest.maxPoints;
  const pts = (i: Pick<WritingItem, 'topic' | 'minWords'>) => writingTaskPoints(writingKindOf(i));
  const total = items.reduce((n, i) => n + pts(i), 0);
  const mine = item ? pts(item) : total / items.length;
  return Math.round((mine / total) * subtest.maxPoints * 1000) / 1000;
}

/** True for the short-message task (task 44-style): topic `wr-message` (or the legacy `write-note`). */
export function isNoteTopic(topic: string | undefined): boolean {
  return topic === 'wr-message' || topic === 'write-note';
}

export interface WritingCounters {
  sentences: number;
  questions: number;
  minSentences: number;
  minQuestions: number;
  maxQuestions: number | null;
  /** Sentences ≥ min and questions within range. */
  lengthOk: boolean;
  questionsOk: boolean;
}

export function writingCounters(
  item: Pick<WritingItem, 'minSentences' | 'minQuestions' | 'maxQuestions'>,
  text: string,
): WritingCounters {
  const s = sentenceSplit(text);
  const maxQ = item.maxQuestions ?? null;
  return {
    sentences: s.sentences.length,
    questions: s.questions,
    minSentences: item.minSentences,
    minQuestions: item.minQuestions,
    maxQuestions: maxQ,
    lengthOk: s.sentences.length >= item.minSentences,
    questionsOk: s.questions >= item.minQuestions && (maxQ === null || s.questions <= maxQ),
  };
}

export interface ChecklistRow {
  id: string;
  uk: string;
  en: string;
  done: boolean;
}

/** The practice checklist: one row per bullet, `done` when a cue matches the current text. */
export function writingChecklist(item: Pick<WritingItem, 'bullets'>, text: string): ChecklistRow[] {
  const cov = bulletCoverage(text, item.bullets);
  const done = new Set(cov.covered);
  return item.bullets.map((b) => ({
    id: b.id,
    uk: b.text.uk,
    en: b.text.en,
    done: done.has(b.id),
  }));
}

/**
 * «Речень: 7 / ≥ 10 · Запитань: 1 / 2–5». A message (`wr-message`) with no question quota: «Речень: 3 / ≥ 5».
 */
export function countersLine(c: WritingCounters, topic?: string, lang: 'uk' | 'en' = 'uk'): string {
  const [sent, quest] = lang === 'uk' ? ['Речень', 'Запитань'] : ['Sentences', 'Questions'];
  if (isNoteTopic(topic) && c.minQuestions === 0 && c.maxQuestions === null) {
    return `${sent}: ${c.sentences} / ≥ ${c.minSentences}`;
  }
  const q =
    c.maxQuestions !== null
      ? `${c.questions} / ${c.minQuestions}–${c.maxQuestions}`
      : `${c.questions} / ≥ ${c.minQuestions}`;
  return `${sent}: ${c.sentences} / ≥ ${c.minSentences} · ${quest}: ${q}`;
}

/** The word under / around a caret or selection inside `text` (for the dictionary pre-fill). */
export function wordAtSelection(text: string, start: number, end: number): string {
  if (end > start) return text.slice(start, end).trim();
  const isWord = (ch: string) => /[\p{L}\p{N}-]/u.test(ch);
  let a = Math.min(start, text.length);
  let b = a;
  while (a > 0 && isWord(text[a - 1]!)) a--;
  while (b < text.length && isWord(text[b]!)) b++;
  return text.slice(a, b).trim();
}
