import { describe, expect, it } from 'vitest';

import {
  groupAnswers,
  isExamPrompt,
  promptLevel,
  promptsForLevel,
  promptTopic,
  rehearsalText,
  rehearseHref,
  summarizeRehearsal,
  type AnswerEntry,
  type AnswerPrompt,
} from '../answers/answers-model';

/** T74 — «Мої відповіді» pure model (TORFL §9). */

function prompt(
  id: string,
  tags: string[] | null,
  packId = 'a1-ukrexam-prompts-001',
): AnswerPrompt {
  return { packId, id, promptUk: `Запитання ${id}`, promptEn: `Prompt ${id}`, tags };
}

function entry(
  id: string,
  promptId: string | null,
  createdAt: number,
  extra: Partial<AnswerEntry> = {},
): AnswerEntry {
  return {
    id,
    promptId,
    uk: 'Мене звати Мітч. Мені тридцять шість років.',
    aiFeedback: null,
    feedbackStatus: 'none',
    createdAt,
    updatedAt: createdAt,
    ...extra,
  };
}

describe('promptTopic / isExamPrompt', () => {
  it('reads the torfl:<topic> slug and falls back to other', () => {
    expect(promptTopic(['ukr-exam:writing', 'ukr-exam:sp-monologue'])).toBe('sp-monologue');
    expect(promptTopic(['ukr-exam', 'ukr-exam:speaking'])).toBe('other');
    expect(promptTopic(null)).toBe('other');
    expect(promptTopic(['ukr-exam:'])).toBe('other');
  });

  it('a prompt is in the bank only with an ukr-exam:speaking|writing tag', () => {
    expect(isExamPrompt(prompt('a', ['ukr-exam:writing', 'ukr-exam:wr-text']))).toBe(true);
    expect(isExamPrompt(prompt('b', ['ukr-exam:wr-text']))).toBe(false);
    expect(isExamPrompt(prompt('b2', ['ukr-exam', 'ukr-exam:mock']))).toBe(false);
    expect(isExamPrompt(prompt('c', ['daily-life']))).toBe(false);
    expect(isExamPrompt(prompt('d', null))).toBe(false);
  });
});

describe('groupAnswers', () => {
  const prompts = [
    prompt('tf-other-01', ['ukr-exam:speaking']),
    prompt('tf-mono-01', ['ukr-exam:writing', 'ukr-exam:sp-monologue']),
    prompt('tf-letter-01', ['ukr-exam:writing', 'ukr-exam:wr-text']),
    prompt('tf-letter-02', ['ukr-exam:writing', 'ukr-exam:wr-text']),
    prompt('tf-coined-01', ['ukr-exam:writing', 'ukr-exam:zzz-new-topic']),
    prompt('moy-den', ['daily-life']),
  ];

  it('groups exam prompts by topic in taxonomy order, unknown slugs after, other last; non-exam dropped', () => {
    const groups = groupAnswers(prompts, []);
    expect(groups.map((g) => g.topic)).toEqual([
      'wr-text',
      'sp-monologue',
      'zzz-new-topic',
      'other',
    ]);
    expect(groups[0]!.labelUk).toBe('Розгорнутий текст');
    expect(groups[2]!.labelUk).toBe('zzz-new-topic');
    expect(groups[3]!.labelUk).toBe('Інші теми');
    expect(groups[0]!.prompts.map((p) => p.prompt.id)).toEqual(['tf-letter-01', 'tf-letter-02']);
  });

  it('attaches entries to their prompt newest first and counts them per topic', () => {
    const entries = [
      entry('e1', 'tf-letter-01', 100),
      entry('e2', 'tf-letter-01', 300),
      entry('e3', 'tf-letter-02', 200),
      entry('e4', 'moy-den', 400),
      entry('e5', null, 500),
      entry('e6', 'unknown-prompt', 600),
    ];
    const groups = groupAnswers(prompts, entries);
    const letter = groups.find((g) => g.topic === 'wr-text')!;
    expect(letter.entryCount).toBe(3);
    expect(letter.prompts[0]!.entries.map((e) => e.id)).toEqual(['e2', 'e1']);
    expect(letter.prompts[1]!.entries.map((e) => e.id)).toEqual(['e3']);
    expect(groups.find((g) => g.topic === 'sp-monologue')!.entryCount).toBe(0);
  });

  it('no exam prompts → empty', () => {
    expect(groupAnswers([prompt('moy-den', ['daily-life'])], [entry('e', 'moy-den', 1)])).toEqual(
      [],
    );
  });
});

describe('rehearsalText', () => {
  it("splits Mitch's own text into sentences when there is no feedback", () => {
    const t = rehearsalText(entry('e', null, 1));
    expect(t).toEqual({
      sentences: ['Мене звати Мітч.', 'Мені тридцять шість років.'],
      corrected: false,
    });
  });

  it('prefers the stored AI correction and says so', () => {
    const aiFeedback = JSON.stringify({
      v: 1,
      sourceUk: 'Я живу в Колорадо вже тринадцять рік.',
      model: 'anthropic/claude-opus-5.5',
      createdAt: 1,
      corrected: 'Я живу в Колорадо вже тринадцять років. Моя наречена Аліна — українка!',
      changes: [],
      summary: 'Добре.',
    });
    const t = rehearsalText(
      entry('e', null, 1, { uk: 'Я живу в Колорадо вже тринадцять рік.', aiFeedback }),
    );
    expect(t.corrected).toBe(true);
    expect(t.sentences).toEqual([
      'Я живу в Колорадо вже тринадцять років.',
      'Моя наречена Аліна — українка!',
    ]);
  });

  it('unreadable feedback falls back to the entry; empty text → no sentences', () => {
    expect(rehearsalText(entry('e', null, 1, { aiFeedback: '{not json' })).corrected).toBe(false);
    expect(rehearsalText(entry('e', null, 1, { uk: '   \n ' })).sentences).toEqual([]);
  });
});

describe('summarizeRehearsal', () => {
  it('averages each pass to one decimal, reports recall as the score, lists weak sentences worst-first', () => {
    const s = summarizeRehearsal(
      [
        { index: 0, score: 100 },
        { index: 1, score: 67 },
        { index: 2, score: 90 },
      ],
      [
        { index: 0, score: 50 },
        { index: 1, score: 100 },
        { index: 2, score: 85 },
      ],
    );
    expect(s.withText).toBe(85.7);
    expect(s.withoutText).toBe(78.3);
    expect(s.score).toBe(78);
    expect(s.weakest).toEqual([0, 1]);
  });

  it('a single pass scores itself; nothing recorded → 0 with no weak lines', () => {
    expect(summarizeRehearsal([{ index: 0, score: 80 }], [])).toMatchObject({
      withText: 80,
      withoutText: null,
      score: 80,
      weakest: [],
    });
    expect(summarizeRehearsal([], [])).toEqual({
      withText: null,
      withoutText: null,
      score: 0,
      weakest: [],
    });
  });
});

describe('rehearseHref', () => {
  it('carries the entry id and topic slug only — never text', () => {
    expect(rehearseHref('abc', 'wr-text')).toEqual({
      pathname: '/torfl/rehearse',
      params: { entryId: 'abc', topic: 'wr-text' },
    });
  });
});

describe('the level rule for prompts (T75)', () => {
  it('a prompt belongs to its pack level; bundled / legacy / unknown = A1', () => {
    expect(promptLevel({ packLevel: 'A2' })).toBe('A2');
    expect(promptLevel({ packLevel: 'A1' })).toBe('A1');
    expect(promptLevel({ packLevel: undefined })).toBe('A1');
    expect(promptLevel({ packLevel: null })).toBe('A1');
    expect(promptLevel({ packLevel: 'B1' })).toBe('B1');
    expect(promptLevel({ packLevel: 'C1' })).toBe('C1');
    expect(promptLevel({ packLevel: 'B3' })).toBe('A1');
  });

  it('promptsForLevel keeps only exam-tagged prompts of that level', () => {
    const prompts = [
      { ...prompt('a1-t', ['ukr-exam:speaking']), packLevel: 'A1' },
      { ...prompt('a2-t', ['ukr-exam:speaking']), packLevel: 'A2' },
      { ...prompt('a1-plain', ['journal']), packLevel: 'A1' },
      { ...prompt('a2-plain', null), packLevel: 'A2' },
      { ...prompt('legacy-t', ['ukr-exam:writing', 'ukr-exam:wr-text']), packLevel: undefined },
    ];
    expect(promptsForLevel(prompts, 'A1').map((p) => p.id)).toEqual(['a1-t', 'legacy-t']);
    expect(promptsForLevel(prompts, 'A2').map((p) => p.id)).toEqual(['a2-t']);
  });

  it('B1 and C1 prompts are filtered by their own level', () => {
    const b1 = { ...prompt('b1', ['ukr-exam:speaking']), packLevel: 'B1' };
    const c1 = { ...prompt('c1', ['ukr-exam:speaking']), packLevel: 'C1' };
    const a1 = { ...prompt('a1', ['ukr-exam:speaking']), packLevel: null };
    expect(promptsForLevel([a1, b1, c1], 'B1')).toEqual([b1]);
    expect(promptsForLevel([a1, b1, c1], 'C1')).toEqual([c1]);
    expect(promptsForLevel([a1, b1, c1], 'A1')).toEqual([a1]);
    expect(promptsForLevel([a1, b1, c1], 'B2')).toEqual([]);
  });

  it('A1 and A2 are isolated in both directions', () => {
    const a1 = { ...prompt('a1', ['ukr-exam:speaking']), packLevel: 'A1' };
    const a2 = { ...prompt('a2', ['ukr-exam:speaking']), packLevel: 'A2' };
    const all = [a1, a2];
    expect(promptsForLevel(all, 'A1')).toEqual([a1]);
    expect(promptsForLevel(all, 'A2')).toEqual([a2]);
    expect(promptsForLevel([a2], 'A1')).toEqual([]);
    expect(promptsForLevel([a1], 'A2')).toEqual([]);
  });
});
