import { describe, expect, it } from 'vitest';
import {
  ExamSchema,
  UKR_STATE_SHAPES,
  UKR_STATE_SUBTEST_ORDER,
  examItemTasks,
  itemPoints,
  officialShapeIssues,
  safeParsePack,
  TORFL_SHAPES,
  type Exam,
  type UkrStateSection,
} from '../src';
import { makeValidExamPack } from './helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * UT16: the `ukr-state` exam format — shape constants (UKR_EXAM_PREP §2),
 * the new item kinds (matching, true-false variants, image) and
 * `officialShapeIssues` for the Ukrainian state exam.
 */

const L = (uk: string, en = uk) => ({ uk, en });

const choice = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  kind: 'choice',
  topic: 'ls-mc3',
  stem: 'Питання',
  options: ['А', 'Б', 'В'],
  answer: 0,
  ...extra,
});
const range = (n: number, prefix: string) =>
  Array.from({ length: n }, (_, i) => `${prefix}${String(i + 1).padStart(2, '0')}`);

const expectation = {
  slots: [{ kind: 'free', id: 'a', required: true, minTokens: 2, cues: ['так'] }],
  accept: ['Так, це я.'],
};

const mono = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  kind: 'speaking-monologue',
  topic: 'sp-monologue',
  topicTitle: L('Моя родина'),
  questions: [
    { uk: 'Хто це?', cues: ['мама'] },
    { uk: 'Де вони?', cues: ['дім'] },
    { uk: 'Що вони роблять?', cues: ['читає'] },
    { uk: 'Який настрій?', cues: ['радість'] },
  ],
  ...over,
});

/** A conforming `ukr-state` mock for a citizenship-form level, built from the shape itself. */
export function makeUkrMock(level: 'A1' | 'A2' | 'B1'): Exam {
  const shape = UKR_STATE_SHAPES[level];
  const sec = (k: string) => shape.sections.find((s) => s.kind === k)! as UkrStateSection;
  const base = (s: UkrStateSection, extra: Record<string, unknown>) => ({
    id: s.kind.slice(0, 2),
    kind: s.kind,
    instructions: L(`${s.durationMin} хвилин.`),
    durationMin: s.durationMin,
    dictionary: s.dictionary,
    navigation: s.navigation,
    maxPoints: s.maxPoints,
    ...extra,
  });
  const ls = sec('listening');
  const rd = sec('reading');
  const wr = sec('writing');
  const sp = sec('speaking');
  const lsItems = range(ls.items, 'ls').map((id, i) =>
    choice(id, {
      ...(i === 0 ? { audio: { storyId: 'ls-01' } } : {}),
      ...(i % 2 === 1 ? { variant: 'true-false', options: ['Правда', 'Неправда'] } : {}),
    }),
  );
  const rdItems: any[] = [
    {
      id: 'rd01',
      kind: 'matching',
      variant: 'headings',
      topic: 'rd-heading',
      stem: 'Добери заголовки',
      left: ['Текст 1', 'Текст 2', 'Текст 3'],
      right: ['Дім', 'Школа', 'Робота', 'Парк', 'Крамниця'],
      key: [2, 0, 3],
    },
    ...range(rd.items - 3, 'rq').map((id) => choice(id, { topic: 'rd-detail' })),
  ];
  const writingItem = (id: string, i: number) => ({
    id,
    kind: 'writing',
    topic: i === 0 ? 'wr-message' : 'wr-text',
    task: L('Напишіть.'),
    bullets: [{ id: 'b1', text: L('хто ви'), cues: ['мене'] }],
    minSentences: 2,
    minWords: wr.words![i]!.min,
    ...('max' in wr.words![i]! ? { maxWords: (wr.words![i] as any).max } : {}),
  });
  const t = sp.speakingTasks!;
  const replies = range(t.dialogueReplies, 'sd').map((id) => ({
    id,
    kind: 'speaking-reply',
    topic: 'sp-dialogue',
    prompt: { storyId: 'ex-01' },
    expect: expectation,
  }));
  const exam = {
    id: `${level.toLowerCase()}-ukr-mock`,
    format: 'ukr-state',
    level,
    mode: 'mock',
    title: L('Зразок'),
    subtests: [
      base(ls, {
        id: 'ls',
        title: L('Слухання'),
        pointsPerItem: 1,
        audioPlays: ls.audioPlays,
        parts: [{ id: 'ls-p1', instructions: L('Оберіть.'), items: lsItems }],
      }),
      base(rd, {
        id: 'rd',
        title: L('Читання'),
        pointsPerItem: 1,
        parts: [{ id: 'rd-p1', instructions: L('Оберіть.'), items: rdItems }],
      }),
      base(wr, {
        id: 'wr',
        title: L('Письмо'),
        parts: wr.partTimes!.map((sec2, i) => ({
          id: `wr-p${i + 1}`,
          instructions: L('Напишіть.'),
          timeSec: sec2,
          items: [writingItem(`wr${i + 1}`, i)],
        })),
      }),
      base(sp, {
        id: 'sp',
        title: L('Говоріння'),
        parts: [
          {
            id: 'sp-p1',
            instructions: L('Опишіть фото.'),
            timeSec: sp.partTimes![0],
            items: [
              mono('sp46', {
                topic: 'sp-photo',
                minSentences: t.photoPhrases,
                maxSentences: t.photoPhrases + 2,
                image: { file: 'images/photo-01.jpg', alt: 'Сім’я в парку' },
              }),
            ],
          },
          {
            id: 'sp-p2',
            instructions: L('Монолог.'),
            timeSec: sp.partTimes![1],
            items: [
              mono('sp47', {
                minSentences: t.monologuePhrases.min,
                maxSentences: t.monologuePhrases.max,
              }),
            ],
          },
          { id: 'sp-p3', instructions: L('Діалог.'), timeSec: sp.partTimes![2], items: replies },
        ],
      }),
    ],
  };
  const parsed = ExamSchema.safeParse(exam);
  expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues, null, 1)).toBe(
    true,
  );
  return parsed.data!;
}

const edited = (level: 'A1' | 'A2' | 'B1', edit: (m: any) => void): Exam => {
  const m = structuredClone(makeUkrMock(level)) as any;
  edit(m);
  return m as Exam;
};
const subOf = (m: any, kind: string) => m.subtests.find((s: any) => s.kind === kind);

describe('UKR_STATE shape constants self-consistency (UKR_EXAM_PREP §2)', () => {
  it('has a shape for all five levels; the TORFL map is untouched (A1, A2 only)', () => {
    expect(Object.keys(UKR_STATE_SHAPES)).toEqual(['A1', 'A2', 'B1', 'B2', 'C1']);
    expect(Object.keys(TORFL_SHAPES)).toEqual(['A1', 'A2']);
  });

  it('the citizenship-form levels have the four parts in order, 25 % each, no lexgram, pass 70 %, no per-part floor', () => {
    for (const level of ['A1', 'A2', 'B1'] as const) {
      const s = UKR_STATE_SHAPES[level];
      expect(s.sections.map((x) => x.kind)).toEqual([...UKR_STATE_SUBTEST_ORDER]);
      expect(s.sections.map((x) => x.weightPct)).toEqual([25, 25, 25, 25]);
      expect(s.pass).toEqual({ totalPct: 70 });
      expect(s.sections.some((x) => (x.kind as string) === 'lexgram')).toBe(false);
    }
  });

  it('B1 numbers: 12/31/33/38 points, 15+60+40+35 = 150 min = the regulation cap', () => {
    const b1 = UKR_STATE_SHAPES.B1;
    expect(b1.sections.map((x) => x.maxPoints)).toEqual([12, 31, 33, 38]);
    expect(b1.sections.map((x) => x.durationMin)).toEqual([15, 60, 40, 35]);
    expect(b1.sections.reduce((n, x) => n + x.durationMin, 0)).toBe(b1.capMin);
    expect(b1.sections.map((x) => x.items)).toEqual([12, 31, 2, 3]);
  });

  it('A1 total 76 min < the 150 cap; A2 total 104 min', () => {
    const total = (l: 'A1' | 'A2') =>
      UKR_STATE_SHAPES[l].sections.reduce((n, x) => n + x.durationMin, 0);
    expect(total('A1')).toBe(8 + 30 + 20 + 18);
    expect(total('A2')).toBe(11 + 45 + 25 + 23);
  });

  it('every level: section weights add to 100, minutes fit the cap, part times add to the section minutes', () => {
    for (const [level, s] of Object.entries(UKR_STATE_SHAPES)) {
      expect(
        s.sections.reduce((n, x) => n + x.weightPct, 0),
        level,
      ).toBe(100);
      expect(
        s.sections.reduce((n, x) => n + x.durationMin, 0),
        level,
      ).toBeLessThanOrEqual(s.capMin);
      for (const x of s.sections as readonly UkrStateSection[]) {
        if (x.partTimes) {
          expect(x.partTimes.reduce((n, t) => n + t, 0) / 60, `${level} ${x.kind}`).toBe(
            x.durationMin,
          );
        }
        if (x.parts !== undefined && x.partTimes) expect(x.partTimes.length).toBe(x.parts);
      }
    }
  });

  it('B2/C1 are the officials’ instrument (40/30/30) and labelled as such; A1/A2 are modelled', () => {
    expect(UKR_STATE_SHAPES.B2.form).toBe('officials');
    expect(UKR_STATE_SHAPES.C1.form).toBe('officials');
    expect(UKR_STATE_SHAPES.B2.sections.map((x) => x.weightPct)).toEqual([40, 30, 30]);
    expect(UKR_STATE_SHAPES.B2.pass.totalPct).toBe(60);
    expect(UKR_STATE_SHAPES.C1.pass.totalPct).toBe(70);
    expect(UKR_STATE_SHAPES.A1.modelled && UKR_STATE_SHAPES.A2.modelled).toBe(true);
    expect(UKR_STATE_SHAPES.B1.modelled).toBe(false);
  });
});

describe('officialShapeIssues — ukr-state', () => {
  it.each(['A1', 'A2', 'B1'] as const)('returns [] for a conforming %s mock', (level) => {
    expect(officialShapeIssues(makeUkrMock(level))).toEqual([]);
  });

  it('does not judge drills', () => {
    const drill = edited('A1', (m) => {
      m.mode = 'drill';
      m.subtests = [m.subtests[0]];
    });
    expect(officialShapeIssues(drill)).toEqual([]);
  });

  it('mutation: wrong section order', () => {
    const m = edited(
      'A1',
      (x) => (x.subtests = [x.subtests[1], x.subtests[0], x.subtests[2], x.subtests[3]]),
    );
    expect(officialShapeIssues(m)[0]).toBe(
      '⚠ official-shape: subtests are [reading, listening, writing, speaking] — the official order is [listening, reading, writing, speaking]',
    );
  });

  it('mutation: B1 listening plays, minutes, navigation, count', () => {
    const m = edited('B1', (x) => {
      const ls = subOf(x, 'listening');
      ls.audioPlays = 1;
      ls.durationMin = 20;
      ls.navigation = 'free';
      ls.parts[0].items.pop();
      ls.maxPoints = 11;
    });
    expect(officialShapeIssues(m)).toEqual([
      '⚠ official-shape: listening "ls" has items 11 — official 12',
      '⚠ official-shape: listening "ls" maxPoints 11 — official 12',
      '⚠ official-shape: listening "ls" durationMin 20 — official 15',
      '⚠ official-shape: listening "ls" navigation free — official linear',
      '⚠ official-shape: listening "ls" audioPlays 1 — official 2',
    ]);
  });

  it('mutation: reading counts a matching item per pair (31 tasks at B1)', () => {
    const m = edited('B1', (x) => subOf(x, 'reading').parts[0].items.pop());
    expect(officialShapeIssues(m)).toContain(
      '⚠ official-shape: reading "rd" has items 30 — official 31',
    );
    const ok = makeUkrMock('B1');
    const r = subOf(ok, 'reading');
    expect(r.parts[0].items.length).toBe(29); // 1 matching + 28 choices
    expect(r.parts[0].items.reduce((n: number, i: any) => n + examItemTasks(i), 0)).toBe(31);
    expect(itemPoints(r, r.parts[0].items[0])).toBe(3);
  });

  it('mutation: writing part times and word limits', () => {
    const m = edited('B1', (x) => {
      const wr = subOf(x, 'writing');
      wr.parts[0].timeSec = 600;
      wr.parts[1].items[0].minWords = 80;
    });
    expect(officialShapeIssues(m)).toEqual([
      '⚠ official-shape: writing "wr" part times are 600/1500 s — official 900/1500 s',
      '⚠ official-shape: writing "wr" part 2 words 80–∞ — official 100–∞',
    ]);
  });

  it('mutation: writing with one part', () => {
    const m = edited('A1', (x) => subOf(x, 'writing').parts.pop());
    expect(
      officialShapeIssues(m).some((l) => l.includes('writing "wr" has parts 1 — official 2')),
    ).toBe(true);
  });

  it('mutation: speaking — no photo, wrong phrase counts, wrong reply count, wrong times', () => {
    const m = edited('B1', (x) => {
      const sp = subOf(x, 'speaking');
      delete sp.parts[0].items[0].image;
      sp.parts[1].items[0].maxSentences = 30;
      sp.parts[2].items.pop();
      sp.parts[2].timeSec = 300;
    });
    expect(officialShapeIssues(m)).toEqual([
      '⚠ official-shape: speaking "sp" part times are 600/900/300 s — official 600/900/600 s',
      '⚠ official-shape: speaking "sp" task 1 (photo description) needs a speaking-monologue item with an image',
      '⚠ official-shape: speaking "sp" monologue phrases 20–30 — official 20–25',
      '⚠ official-shape: speaking "sp" dialogue has 4 replies — official 5',
    ]);
  });

  it('mutation: dictionary on', () => {
    const m = edited('A2', (x) => (subOf(x, 'reading').dictionary = true));
    expect(officialShapeIssues(m)).toEqual([
      '⚠ official-shape: reading "rd" dictionary true — official false',
    ]);
  });
});

describe('ukr-state schema rules', () => {
  it('a ukr-state mock refuses a lexgram subtest; a ukr-state drill allows it (study-only)', () => {
    const mock = structuredClone(makeUkrMock('A1')) as any;
    mock.subtests.push({
      ...structuredClone(subOf(mock, 'reading')),
      id: 'lg',
      kind: 'lexgram',
      parts: [
        {
          id: 'lg-p1',
          instructions: L('Оберіть.'),
          items: [choice('lg01', { topic: 'g19' })],
        },
      ],
      maxPoints: 1,
    });
    const r = ExamSchema.safeParse(mock);
    expect(r.success).toBe(false);
    expect(JSON.stringify((r as any).error.issues)).toContain('no lexgram part');
    const drill = { ...mock, mode: 'drill' };
    expect(ExamSchema.safeParse(drill).success).toBe(true);
  });

  it('a torfl exam still needs ≥ 3 bullets and minSentences ≥ 5; ukr-state needs ≥ 1 bullet / ≥ 1 sentence', () => {
    const pack = makeValidExamPack() as any;
    const wr = pack.exams[0].subtests.find((s: any) => s.kind === 'writing').parts[0].items[0];
    wr.bullets = wr.bullets.slice(0, 2);
    const bad = safeParsePack(pack);
    expect(bad.success).toBe(false);
    pack.exams[0].format = 'ukr-state';
    pack.exams[0].subtests = pack.exams[0].subtests.filter((s: any) => s.kind !== 'lexgram');
    expect(safeParsePack(pack).success).toBe(true);
  });

  it('matching: key length, range, one-to-one, right shortage', () => {
    const base = (over: Record<string, unknown>) => {
      const m = structuredClone(makeUkrMock('A1')) as any;
      Object.assign(subOf(m, 'reading').parts[0].items[0], over);
      return ExamSchema.safeParse(m);
    };
    const msg = (r: any) => JSON.stringify(r.error?.issues ?? []);
    expect(base({}).success).toBe(true);
    expect(msg(base({ key: [0, 1] }))).toContain('one right-index per left item');
    expect(msg(base({ key: [0, 1, 9] }))).toContain('out of range');
    expect(msg(base({ key: [0, 1, 1] }))).toContain('matched twice');
    expect(msg(base({ right: ['а', 'б'], key: [0, 1, 0] }))).toContain('a shortage is not');
  });

  it('true-false variants fix the option count; gap variants need exactly one gap', () => {
    const run = (item: any) => {
      const m = structuredClone(makeUkrMock('A1')) as any;
      subOf(m, 'reading').parts[0].items.push(item);
      subOf(m, 'reading').maxPoints += 1;
      return JSON.stringify((ExamSchema.safeParse(m) as any).error?.issues ?? []);
    };
    expect(
      run(choice('x1', { variant: 'true-false', options: ['Правда', 'Неправда', 'Не сказано'] })),
    ).toContain('exactly 2 options');
    expect(
      run(choice('x2', { variant: 'true-false-ns', options: ['Правда', 'Неправда'] })),
    ).toContain('exactly 3 options');
    expect(run(choice('x3', { variant: 'gap-word', stem: 'Без пропуску' }))).toContain(
      'exactly one gap',
    );
    expect(run(choice('x4', { variant: 'gap-form', stem: 'Я … вдома.' }))).toBe('[]');
  });

  it('an image needs an image extension and a relative path; an unknown format is refused', () => {
    const run = (file: string) => {
      const m = structuredClone(makeUkrMock('A1')) as any;
      subOf(m, 'speaking').parts[0].items[0].image.file = file;
      return ExamSchema.safeParse(m).success;
    };
    expect(run('images/a.png')).toBe(true);
    expect(run('images/a.txt')).toBe(false);
    expect(run('/abs/a.png')).toBe(false);
    expect(run('../a.png')).toBe(false);
    const m = structuredClone(makeUkrMock('A1')) as any;
    m.format = 'trki';
    expect(ExamSchema.safeParse(m).success).toBe(false);
  });

  it('old TORFL exams still parse (format torfl) and keep their five-subtest check', () => {
    const r = safeParsePack(makeValidExamPack());
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.exams![0]!.format).toBe('torfl');
      expect(officialShapeIssues(r.data.exams![0]!).length).toBeGreaterThan(0);
    }
  });
});
