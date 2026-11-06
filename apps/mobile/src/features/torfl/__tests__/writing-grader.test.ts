import { ExamSchema, type Exam, type Pack, type WritingItem } from '@sutinki/schema';
import examPackJson from '@sutinki/schema/fixtures/packs/a1-ukrexam-fixture/pack.json';
import { describe, expect, it } from 'vitest';

import { WRITING_RUBRICS } from '../grading/rubrics';
import {
  aiOnlyIds,
  bulletCoverage,
  countQuestions,
  criteriaPercent,
  gradeWritingOffline,
  letterForm,
  offlineItemScore,
  paragraphCount,
  selfCheckCriteria,
  selfChecksFor,
  sentenceSplit,
  volumeShare,
  writingKindOf,
} from '../grading/writing';

const PACK = examPackJson as unknown as Pack;
const EXAM: Exam = ExamSchema.parse(PACK.exams!.find((e) => e.id === 'a1-mock-fx'));
const WRITING = EXAM.subtests.find((s) => s.kind === 'writing')!;
const ITEMS = WRITING.parts
  .flatMap((p) => p.items)
  .filter((i) => i.kind === 'writing') as WritingItem[];
/** Task 44 (message, 10–25 words, bullets «мене» / «живу») and task 45 (text, 30–50 words). */
const MSG = ITEMS.find((i) => i.topic === 'wr-message')!;
const TEXT = ITEMS.find((i) => i.topic === 'wr-text')!;

/** A good message: greeting + sign-off, both bullets, 17 words. */
export const GOOD_MESSAGE =
  'Привіт, Оксано!\nМене звати Мітч. Я живу в Колорадо і працюю вдома.\nДо зустрічі!';
/** Weak: no greeting, no sign-off, one bullet, 5 words. */
const WEAK_MESSAGE = 'Я живу в Колорадо.';
/** A good text: two paragraphs, both bullets, 36 words. */
const GOOD_TEXT =
  'Мене звати Мітч, мені тридцять шість років. Я живу в Колорадо з моєю нареченою.\nВона українка. Ми часто гуляємо в парку, читаємо книжки та готуємо вечерю. Мені дуже подобається наше життя.';

describe('sentenceSplit / countQuestions', () => {
  it('splits on . ! ? … runs, counts ? once per sentence, ignores empty fragments', () => {
    const s = sentenceSplit('Привіт!!! Як справи?! Добре… Так. . . Що?');
    expect(s.sentences).toEqual(['Привіт', 'Як справи', 'Добре', 'Так', 'Що']);
    expect(s.questions).toBe(2);
    expect(countQuestions('Де? Хто? Ні.')).toBe(2);
  });

  it('a line without a terminator is still a sentence (greeting lines)', () => {
    const s = sentenceSplit('Дорога Анно\nЯк справи?\nБувай');
    expect(s.sentences).toEqual(['Дорога Анно', 'Як справи', 'Бувай']);
    expect(s.questions).toBe(1);
  });

  it('empty text → nothing', () => {
    expect(sentenceSplit('   \n ')).toEqual({ sentences: [], questions: 0 });
  });
});

describe('bulletCoverage', () => {
  it('matches exact cues, stem globs and multi-word phrases over normalized tokens', () => {
    const c = bulletCoverage('Мене ЗВАТИ Мітч, я працюю вдома і дуже люблю каву.', [
      { id: 'name', cues: ['звати'] },
      { id: 'work', cues: ['працю*'] },
      { id: 'like', cues: ['люблю', 'подобається'] },
      { id: 'home', cues: ['працюю вдома'] },
      { id: 'live', cues: ['живу', 'живемо'] },
    ]);
    expect(c.covered).toEqual(['name', 'work', 'like', 'home']);
    expect(c.missing).toEqual(['live']);
    expect(c.total).toBe(5);
  });

  it('apostrophe / ґ tolerant and punctuation-blind', () => {
    const c = bulletCoverage('Я люблю п’ятницю, ґанок і мʼясо!', [
      { id: 'day', cues: ["п'ятниц*"] },
      { id: 'porch', cues: ['ганок'] },
      { id: 'meat', cues: ['мʼяс*'] },
    ]);
    expect(c.covered).toEqual(['day', 'porch', 'meat']);
  });
});

describe('letterForm (Ukrainian greetings and sign-offs)', () => {
  it('greeting on the first line + a sign-off near the end', () => {
    expect(letterForm(GOOD_MESSAGE)).toEqual({ greeting: true, signOff: true });
    expect(letterForm('Вітаю, Анно Петрівно! Я тут. З повагою, Мітч')).toEqual({
      greeting: true,
      signOff: true,
    });
    expect(letterForm('Добрий день!\nДякую. Бувайте')).toEqual({ greeting: true, signOff: true });
  });
  it('neither when the text is a bare paragraph', () => {
    expect(letterForm('Я живу тут. Я працюю там.')).toEqual({ greeting: false, signOff: false });
  });
  it('a sign-off word buried in the middle of a long text does not count', () => {
    const mid = `Привіт!\nЯ сказав бувай мамі зранку. ${'Потім я працював увесь день. '.repeat(8)}Кінець.`;
    expect(letterForm(mid)).toEqual({ greeting: true, signOff: false });
  });
  it('paragraphCount counts non-empty lines', () => {
    expect(paragraphCount('а\n\nб\n  \nв')).toBe(3);
  });
});

describe('writingKindOf', () => {
  it('by topic slug; falls back to the word limit', () => {
    expect(writingKindOf({ topic: 'wr-message', minWords: undefined })).toBe('message');
    expect(writingKindOf({ topic: 'wr-text', minWords: undefined })).toBe('text');
    expect(writingKindOf({ topic: 'x', minWords: 100 })).toBe('text');
    expect(writingKindOf({ topic: 'x', minWords: 10 })).toBe('message');
    expect(writingKindOf(MSG)).toBe('message');
    expect(writingKindOf(TEXT)).toBe('text');
  });
});

describe('volumeShare', () => {
  const lim = { minWords: 10, maxWords: 25, minSentences: 3, sentences: 3 };
  it('inside the limit full; below proportional; a little above full; far above half; empty 0', () => {
    expect(volumeShare(15, lim)).toBe(1);
    expect(volumeShare(5, lim)).toBe(0.5);
    expect(volumeShare(30, lim)).toBe(1); // ≤ 25 × 1.25
    expect(volumeShare(40, lim)).toBe(0.5);
    expect(volumeShare(0, lim)).toBe(0);
  });
  it('no word limits → sentences vs minSentences', () => {
    expect(volumeShare(10, { minWords: null, maxWords: null, minSentences: 4, sentences: 2 })).toBe(
      0.5,
    );
  });
});

describe('gradeWritingOffline (rubric data)', () => {
  it('message: content 40 + form 10 + volume 10 = 60 offline of 100 → a good message is 100 % provisional', () => {
    const g = gradeWritingOffline(MSG, GOOD_MESSAGE);
    expect(g.kind).toBe('message');
    expect(g.criteria).toEqual([
      { id: 'content', score: 40, max: 40 },
      { id: 'form', score: 10, max: 10 },
      { id: 'volume', score: 10, max: 10 },
    ]);
    expect(g.offlineMax).toBe(60);
    expect(g.offlinePoints).toBe(60);
    expect(g.pct).toBe(100);
    expect(g.provisional).toBe(true);
    expect(g.details).toMatchObject({
      kind: 'message',
      pointsCovered: 2,
      pointsTotal: 2,
      greeting: true,
      signOff: true,
      minWords: 10,
      maxWords: 25,
    });
  });

  it('a weak message: one bullet of two (20), no greeting/sign-off (0), 4 words of 10 (4) → 24/60 = 40 %', () => {
    const g = gradeWritingOffline(MSG, WEAK_MESSAGE);
    expect(g.criteria.map((c) => c.score)).toEqual([20, 0, 4]);
    expect(g.pct).toBe(40);
    expect(g.details.coveredIds).toEqual(['b2']);
    expect(g.details.missingIds).toEqual(['b1']);
  });

  it('a message needs a greeting OR a sign-off: either earns the whole form row', () => {
    expect(
      gradeWritingOffline(MSG, 'Привіт! Мене звати Мітч. Я живу тут і працюю вдома щодня.')
        .criteria[1]!.score,
    ).toBe(10);
    expect(
      gradeWritingOffline(MSG, 'Мене звати Мітч. Я живу тут і працюю вдома щодня. Бувай!')
        .criteria[1]!.score,
    ).toBe(10);
  });

  it('text: content 22 + form 4 + volume 4 = 30 offline; two paragraphs earn the form row', () => {
    const g = gradeWritingOffline(TEXT, GOOD_TEXT);
    expect(g.kind).toBe('text');
    expect(g.offlineMax).toBe(30);
    expect(g.criteria).toEqual([
      { id: 'content', score: 22, max: 22 },
      { id: 'form', score: 4, max: 4 },
      { id: 'volume', score: 4, max: 4 },
    ]);
    expect(g.pct).toBe(100);
  });

  it('text: one block of ≥ 3 sentences earns half the form row; fewer than 3 earns none', () => {
    const block =
      'Мене звати Мітч. Я живу в Колорадо. Мені подобається тут жити з наречено. Ми гуляємо.';
    expect(gradeWritingOffline(TEXT, block).criteria[1]!.score).toBe(2);
    expect(gradeWritingOffline(TEXT, 'Мене звати Мітч.').criteria[1]!.score).toBe(0);
  });

  it('an empty text scores 0 on every criterion', () => {
    const g = gradeWritingOffline(MSG, '  \n');
    expect(g.criteria.map((c) => c.score)).toEqual([0, 0, 0]);
    expect(g.pct).toBe(0);
  });

  it('offlineItemScore maps the provisional pct onto the response points', () => {
    const g = gradeWritingOffline(MSG, WEAK_MESSAGE);
    expect(offlineItemScore(g, 10)).toEqual({ points: 4, maxPoints: 10, outcome: 'half' });
    expect(offlineItemScore(gradeWritingOffline(MSG, GOOD_MESSAGE), 10).outcome).toBe('full');
    expect(offlineItemScore(gradeWritingOffline(MSG, ''), 10).outcome).toBe('wrong');
  });
});

describe('criteriaPercent + the self-check fold', () => {
  it('a full message set is Σ score / 100', () => {
    expect(
      criteriaPercent([
        { id: 'content', score: 30, max: 40 },
        { id: 'form', score: 10, max: 10 },
        { id: 'norms', score: 25.5, max: 40 },
        { id: 'volume', score: 10, max: 10 },
      ]),
    ).toBe(75.5);
    expect(criteriaPercent([])).toBe(0);
  });

  it('self-checks cover exactly the AI-only max of each kind (norms split in two halves)', () => {
    for (const kind of ['message', 'text'] as const) {
      const aiMax = WRITING_RUBRICS[kind].filter((c) => !c.offline).reduce((n, c) => n + c.max, 0);
      expect(selfChecksFor(kind).reduce((n, c) => n + c.max, 0)).toBe(aiMax);
      expect(aiOnlyIds(kind)).toEqual(
        WRITING_RUBRICS[kind].filter((c) => !c.offline).map((c) => c.id),
      );
    }
    expect(selfChecksFor('message').map((c) => c.id)).toEqual(['norms-forms', 'norms-verbs']);
    expect(selfChecksFor('text').map((c) => c.id)).toEqual([
      'fit',
      'coherence',
      'norms-forms',
      'norms-verbs',
      'richness',
    ]);
  });

  it('message: all-ones self-check → 100 %; mixed answers fold into norms (20 + 20)', () => {
    const offline = gradeWritingOffline(MSG, GOOD_MESSAGE).criteria;
    const all = selfCheckCriteria(offline, { 'norms-forms': 1, 'norms-verbs': 1 }, 'message');
    expect(all.map((c) => [c.id, c.score, c.max])).toEqual([
      ['content', 40, 40],
      ['form', 10, 10],
      ['norms', 40, 40],
      ['volume', 10, 10],
    ]);
    expect(criteriaPercent(all)).toBe(100);
    const mixed = selfCheckCriteria(offline, { 'norms-forms': 0.5, 'norms-verbs': 0 }, 'message');
    expect(mixed.find((c) => c.id === 'norms')!.score).toBe(10);
    expect(criteriaPercent(mixed)).toBe(70);
  });

  it('text: Σ max = 100 and unanswered checks score 0', () => {
    const offline = gradeWritingOffline(TEXT, GOOD_TEXT).criteria;
    const out = selfCheckCriteria(offline, {}, 'text');
    expect(out.reduce((n, c) => n + c.max, 0)).toBe(100);
    expect(criteriaPercent(out)).toBe(30);
  });
});
