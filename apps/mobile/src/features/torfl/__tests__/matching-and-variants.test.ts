import type { Exam, ExamSubtest, MatchingItem } from '@sutinki/schema';
import { describe, expect, it } from 'vitest';

import { buildExamListItems, introSubtestRows, type ExamSummaryLike } from '../hub-model';
import { isAnswered, type ExamAnswer } from '../model';
import { reviewEntries } from '../results-model';
import { OPTION_LETTERS, itemMaxPoints, scoreItem } from '../scoring';

/** UT16b: the `matching` item kind end to end (scoring, answers, review) and the hub's `modelled` flag. */

const item = {
  id: 'm1',
  topic: 'rd-heading',
  kind: 'matching',
  variant: 'headings',
  stem: 'Підберіть до кожного абзацу заголовок.',
  left: ['Абзац 1', 'Абзац 2', 'Абзац 3', 'Абзац 4'],
  right: ['Мій дім', 'Наше місто', 'Улюблена їжа', 'Подорож до Львова', 'Свята', 'Погода'],
  key: [3, 0, 4, 1],
} as MatchingItem;

const subtest = {
  id: 'reading',
  kind: 'reading',
  title: { uk: 'Читання', en: 'Reading' },
  durationMin: 40,
  maxPoints: 4,
  dictionary: false,
  pointsPerItem: 1,
  parts: [
    {
      id: 'p1',
      instructions: { uk: 'Прочитайте тексти.', en: 'Read the texts.' },
      items: [item],
    },
  ],
} as unknown as ExamSubtest;

const matching = (picks: (number | null)[]): ExamAnswer => ({ kind: 'matching', picks });

describe('matching item scoring through scoreItem', () => {
  it('a matching item is worth pointsPerItem × pairs, an item override wins', () => {
    expect(itemMaxPoints(item, subtest)).toBe(4);
    expect(itemMaxPoints({ ...item, points: 6 }, subtest)).toBe(6);
  });

  it('all pairs right = full, all points', () => {
    expect(scoreItem(item, { picks: [3, 0, 4, 1] }, subtest)).toEqual({
      points: 4,
      maxPoints: 4,
      outcome: 'full',
    });
  });

  it('some pairs right = half, proportional points', () => {
    expect(scoreItem(item, { picks: [3, 0, 2, 5] }, subtest)).toEqual({
      points: 2,
      maxPoints: 4,
      outcome: 'half',
    });
    expect(scoreItem(item, { picks: [3, null, null, null] }, subtest)?.points).toBe(1);
  });

  it('none right = wrong; nothing picked = blank', () => {
    expect(scoreItem(item, { picks: [0, 1, 2, 5] }, subtest)?.outcome).toBe('wrong');
    expect(scoreItem(item, { picks: [null, null, null, null] }, subtest)?.outcome).toBe('blank');
  });

  it('a wrong answer shape for the kind scores null', () => {
    expect(scoreItem(item, { index: 1 }, subtest)).toBeNull();
    expect(scoreItem(item, { text: 'x' }, subtest)).toBeNull();
  });

  it('option letters run А…М (12)', () => {
    expect(OPTION_LETTERS).toHaveLength(12);
    expect(OPTION_LETTERS[0]).toBe('А');
    expect(OPTION_LETTERS[11]).toBe('М');
  });
});

describe('isAnswered for matching answers', () => {
  it('answered as soon as one pair is picked', () => {
    expect(isAnswered(matching([null, null, null, null]))).toBe(false);
    expect(isAnswered(matching([]))).toBe(false);
    expect(isAnswered(matching([null, 2, null, null]))).toBe(true);
    expect(isAnswered(matching([0, 0, 0, 0]))).toBe(true); // index 0 is a real pick
  });
});

describe('reviewEntries for a matching item', () => {
  it('one entry, a row per left item marked chosen / correct, with the key shown', () => {
    const entries = reviewEntries(subtest, { m1: matching([3, 1, null, 1]) });
    expect(entries).toHaveLength(1);
    const e = entries[0]!;
    expect(e.number).toBe(1);
    expect(e.stem).toBe(item.stem);
    expect(e.outcome).toBe('half');
    expect(e.typed).toBeNull();
    expect(e.options).toHaveLength(4);
    expect(e.options.map((o) => o.chosen)).toEqual([true, true, false, true]);
    expect(e.options.map((o) => o.correct)).toEqual([true, false, false, true]);
    expect(e.options[0]!.text).toContain('Абзац 1');
    expect(e.options[0]!.text).toContain('Г'); // right[3] is the fourth letter
    expect(e.options[2]!.text).toContain('—'); // not picked
    expect(e.options[2]!.text).toContain('Свята'); // the key is revealed
  });

  it('an unanswered matching item reviews as blank with every row unchosen', () => {
    const e = reviewEntries(subtest, {})[0]!;
    expect(e.outcome).toBe('blank');
    expect(e.options.every((o) => !o.chosen && !o.correct)).toBe(true);
  });
});

describe('hub-model: the modelled flag and objective matching', () => {
  const exam = (level: string, format: string, mode = 'mock'): Exam =>
    ({
      id: `x-${level}`,
      title: { uk: 'Іспит', en: 'Exam' },
      mode,
      format,
      level,
      subtests: [subtest],
    }) as unknown as Exam;
  const summary = (e: Exam): ExamSummaryLike => ({
    packId: 'p',
    examId: e.id,
    mode: e.mode,
    titleUk: e.title.uk,
    titleEn: e.title.en,
    exam: e,
  });

  it('A1 / A2 ukr-state mocks are modelled; B1+ and non-ukr-state or drill rows are not', () => {
    const rows = buildExamListItems(
      [
        summary(exam('A1', 'ukr-state')),
        summary(exam('A2', 'ukr-state')),
        summary(exam('B1', 'ukr-state')),
        summary(exam('C1', 'ukr-state')),
        summary(exam('A1', 'torfl')),
        summary(exam('A1', 'ukr-state', 'drill')),
      ],
      [],
    );
    expect(rows.map((r) => r.modelled)).toEqual([true, true, false, false, false, false]);
  });

  it('a matching-only subtest counts as objective in the intro table', () => {
    const [row] = introSubtestRows(exam('B1', 'ukr-state'));
    expect(row!.points).toBe(4);
    expect(row!.maxPoints).toBe(4);
    expect(row!.itemCount).toBe(1);
  });
});
