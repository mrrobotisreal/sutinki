import type { Exam, WritingItem } from '@sutinki/schema';

import type { ExamSummaryLike } from '../hub-model';
import { isNoteTopic } from './writing-model';

/**
 * Writing practice catalog (T72, TORFL §8.3 practice mode) — PURE: every
 * writing item of every installed exam (drill sets first, then mocks — a
 * mock's letter task is as good a practice prompt as any once it has been
 * sat, and before that it is still the exact exam format), with the pack /
 * exam it lives in. The hub «Тренировки → Письмо» tab lists these.
 */
export interface WritingPracticeEntry {
  packId: string;
  examId: string;
  examTitleUk: string;
  mode: 'drill' | 'mock';
  subtestId: string;
  item: WritingItem;
}

export function writingPracticeEntries(
  summaries: readonly ExamSummaryLike[],
): WritingPracticeEntry[] {
  const out: WritingPracticeEntry[] = [];
  const push = (s: ExamSummaryLike, exam: Exam) => {
    for (const subtest of exam.subtests) {
      if (subtest.kind !== 'writing') continue;
      for (const item of subtest.parts.flatMap((p) => p.items)) {
        if (item.kind !== 'writing') continue;
        out.push({
          packId: s.packId,
          examId: s.examId,
          examTitleUk: s.titleUk,
          mode: s.mode,
          subtestId: subtest.id,
          item,
        });
      }
    }
  };
  for (const s of summaries) if (s.exam && s.mode === 'drill') push(s, s.exam);
  for (const s of summaries) if (s.exam && s.mode === 'mock') push(s, s.exam);
  return out;
}

/** The practice route params (`app/torfl/writing.tsx`). */
export function writingPracticeHref(e: Pick<WritingPracticeEntry, 'packId' | 'examId' | 'item'>): {
  pathname: '/torfl/writing';
  params: Record<string, string>;
} {
  return {
    pathname: '/torfl/writing',
    params: { packId: e.packId, examId: e.examId, itemId: e.item.id },
  };
}

/**
 * The Письмо practice list grouped by text type (T76): «Розгорнутий текст» (task 45-style) then
 * «Коротке повідомлення» (`wr-message`, task 44-style). The hub is already level-scoped
 * (its exams come from `useExams({level})`, THE LEVEL RULE), so a group only
 * ever holds one level's items. A header is shown for the note group always
 * and for the letter group only when notes exist (A1 stays a flat list).
 */
export interface WritingPracticeGroup {
  key: 'letter' | 'note';
  titleUk: string | null;
  entries: WritingPracticeEntry[];
}

export function writingPracticeGroups(
  entries: readonly WritingPracticeEntry[],
): WritingPracticeGroup[] {
  const notes = entries.filter((e) => isNoteTopic(e.item.topic));
  const letters = entries.filter((e) => !isNoteTopic(e.item.topic));
  const out: WritingPracticeGroup[] = [];
  if (letters.length > 0) {
    out.push({
      key: 'letter',
      titleUk: notes.length > 0 ? 'Розгорнутий текст' : null,
      entries: letters,
    });
  }
  if (notes.length > 0) out.push({ key: 'note', titleUk: 'Коротке повідомлення', entries: notes });
  return out;
}
