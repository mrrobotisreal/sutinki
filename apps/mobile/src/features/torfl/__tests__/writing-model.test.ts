import { ExamSchema, type Exam } from '@sutinki/schema';
import examPack from '@sutinki/schema/fixtures/packs/a1-ukrexam-fixture/pack.json';
import { describe, expect, it } from 'vitest';

import {
  countersLine,
  isNoteTopic,
  wordAtSelection,
  writingChecklist,
  writingCounters,
  writingTaskOf,
} from '../writing/writing-model';

const ITEM = {
  minSentences: 10,
  minQuestions: 2,
  maxQuestions: 5,
  bullets: [
    { id: 'b1', text: { uk: 'як вас звати', en: 'name' }, cues: ['звати'] },
    { id: 'b2', text: { uk: 'де ви живете', en: 'live' }, cues: ['живу', 'живемо'] },
  ],
};

describe('writing editor model', () => {
  it('counters + flags', () => {
    const c = writingCounters(ITEM, 'Мене звати Мітч. Як справи? Де ти?');
    expect(c).toMatchObject({ sentences: 3, questions: 2, lengthOk: false, questionsOk: true });
    expect(countersLine(c)).toBe('Речень: 3 / ≥ 10 · Запитань: 2 / 2–5');
    expect(countersLine(writingCounters({ ...ITEM, maxQuestions: undefined }, 'А?'))).toBe(
      'Речень: 1 / ≥ 10 · Запитань: 1 / ≥ 2',
    );
  });
  it('checklist ticks as cues match', () => {
    expect(writingChecklist(ITEM, 'Мене звати Мітч.').map((r) => [r.id, r.done])).toEqual([
      ['b1', true],
      ['b2', false],
    ]);
  });
  it('wordAtSelection: a selection wins; a caret expands to the word around it', () => {
    const t = 'Я живу в Колорадо.';
    expect(wordAtSelection(t, 2, 6)).toBe('живу');
    expect(wordAtSelection(t, 11, 11)).toBe('Колорадо');
    expect(wordAtSelection(t, 1, 1)).toBe('Я');
    expect(wordAtSelection(t, 18, 18)).toBe('');
  });
});

describe('writingTaskOf (analytics task + topic)', () => {
  const EXAM: Exam = ExamSchema.parse(
    (examPack as unknown as { exams: unknown[] }).exams.find(
      (e) => (e as { id: string }).id === 'a1-mock-fx',
    ),
  );
  const st = EXAM.subtests.find((s) => s.kind === 'writing')!;

  it('task 44 is task 1 / wr-message, task 45 is task 2 / wr-text', () => {
    expect(writingTaskOf(EXAM, st.id, 'wr44')).toEqual({ task: 1, topic: 'wr-message' });
    expect(writingTaskOf(EXAM, st.id, 'wr45')).toEqual({ task: 2, topic: 'wr-text' });
  });

  it('an unknown item or subtest is { task: 0, topic: "none" }', () => {
    expect(writingTaskOf(EXAM, st.id, 'no-such-item')).toEqual({ task: 0, topic: 'none' });
    expect(writingTaskOf(EXAM, 'no-such-subtest', 'wr44')).toEqual({ task: 0, topic: 'none' });
  });

  it('a non-writing item id is not a writing task', () => {
    const objective = EXAM.subtests.find((s) => s.kind !== 'writing')!;
    const id = objective.parts[0]!.items[0]!.id;
    expect(writingTaskOf(EXAM, objective.id, id)).toEqual({ task: 0, topic: 'none' });
  });

  it('isNoteTopic: the short message (and the legacy slug), not the text', () => {
    expect(isNoteTopic('wr-message')).toBe(true);
    expect(isNoteTopic('write-note')).toBe(true);
    expect(isNoteTopic('wr-text')).toBe(false);
  });
});
