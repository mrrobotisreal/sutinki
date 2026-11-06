import { describe, expect, it } from 'vitest';

import {
  BAND_BAR_CLASS,
  bandFor,
  computeReadiness,
  drillEstimate,
  latestMockPcts,
  recommendToday,
  weakestTopic,
  type MockAttemptLike,
  type ReadinessRow,
} from '../readiness';

const DAY = 86_400_000;
const NOW = 1_790_000_000_000;

const rowsOf = (pcts: Record<string, number | null>): ReadinessRow[] =>
  computeReadiness({
    now: NOW,
    mocks: Object.fromEntries(
      Object.entries(pcts)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => [k, { pct: v!, finishedAt: NOW - DAY, provisional: false }]),
    ),
    drills: {},
  });

describe('bands (relative to the level threshold)', () => {
  it('default B1 (70): < 60 red · 60–70 amber · 70–80 green · ≥ 80 gold, inclusive at the lower edge', () => {
    expect(bandFor(59.9)).toBe('fail');
    expect(bandFor(60)).toBe('borderline');
    expect(bandFor(69.9)).toBe('borderline');
    expect(bandFor(70)).toBe('pass');
    expect(bandFor(79.9)).toBe('pass');
    expect(bandFor(80)).toBe('margin');
    expect(bandFor(100)).toBe('margin');
  });
  it('an explicit threshold moves every edge (B2: 60)', () => {
    expect(bandFor(49.9, 60)).toBe('fail');
    expect(bandFor(50, 60)).toBe('borderline');
    expect(bandFor(59.9, 60)).toBe('borderline');
    expect(bandFor(60, 60)).toBe('pass');
    expect(bandFor(69.9, 60)).toBe('pass');
    expect(bandFor(70, 60)).toBe('margin');
  });
  it('every band maps to a theme token class (no raw colours)', () => {
    expect(Object.values(BAND_BAR_CLASS).sort()).toEqual([
      'bg-danger',
      'bg-gold',
      'bg-success',
      'bg-track-warm',
    ]);
  });
});

describe('drill estimate with shrinkage', () => {
  it('(correct + 15) / (n + 30) × 100, one decimal', () => {
    expect(drillEstimate({ answered: 10, correct: 10 })).toBe(62.5);
    expect(drillEstimate({ answered: 10, correct: 0 })).toBe(37.5);
    expect(drillEstimate({ answered: 1, correct: 1 })).toBe(51.6);
    expect(drillEstimate({ answered: 200, correct: 180 })).toBe(84.8);
  });
  it('no responses → null (unknown), never a flat 50', () => {
    expect(drillEstimate(undefined)).toBeNull();
    expect(drillEstimate({ answered: 0, correct: 0 })).toBeNull();
  });
  it('a perfect streak needs many answers to cross the 70 line (shrinkage works)', () => {
    expect(drillEstimate({ answered: 5, correct: 5 })!).toBeLessThan(70);
    expect(drillEstimate({ answered: 30, correct: 30 })!).toBe(75);
  });
});

describe('computeReadiness', () => {
  it('prefers a mock within 21 days over drills, labelled with its age', () => {
    const rows = computeReadiness({
      now: NOW,
      mocks: { reading: { pct: 74.4, finishedAt: NOW - 3 * DAY, provisional: false } },
      drills: { reading: { answered: 50, correct: 10 } },
    });
    const row = rows.find((r) => r.kind === 'reading')!;
    expect(row).toMatchObject({ pct: 74.4, band: 'pass', source: 'mock', mockDaysAgo: 3 });
    expect(row.label).toBe('пробний іспит 3 дн. тому');
  });
  it('a mock older than 21 days falls back to the drill estimate', () => {
    const rows = computeReadiness({
      now: NOW,
      mocks: { reading: { pct: 90, finishedAt: NOW - 22 * DAY, provisional: false } },
      drills: { reading: { answered: 30, correct: 24 } },
    });
    const row = rows.find((r) => r.kind === 'reading')!;
    expect(row.source).toBe('estimate');
    expect(row.pct).toBe(65);
    expect(row.band).toBe('borderline');
    expect(row.label).toBe('оцінка за тренуваннями · 30 відповідей');
  });
  it('exactly 21 days still counts; a provisional mock is labelled', () => {
    const rows = computeReadiness({
      now: NOW,
      mocks: { writing: { pct: 70, finishedAt: NOW - 21 * DAY, provisional: true } },
      drills: {},
    });
    const w = rows.find((r) => r.kind === 'writing')!;
    expect(w.source).toBe('mock');
    expect(w.provisional).toBe(true);
    expect(w.label).toContain('попередньо');
  });
  it('unknown with no mock and no responses; one row per section of the level, in shape order', () => {
    const rows = computeReadiness({ now: NOW, mocks: {}, drills: {} });
    expect(rows.map((r) => r.kind)).toEqual(['listening', 'reading', 'writing', 'speaking']);
    expect(rows.every((r) => r.pct === null && r.band === null && r.source === 'none')).toBe(true);
    expect(rows[0]!.label).toBe('зʼявиться після першого тренування');
    expect(rows[2]!.label).toBe('зʼявиться після пробного іспиту');
    expect(rows[3]!.label).toBe('зʼявиться після пробного іспиту');
  });
  it('B2 / C1 have no listening row; A1 has the four; rows use the level threshold', () => {
    const kinds = (level: 'A1' | 'B1' | 'B2' | 'C1') =>
      computeReadiness({ level, now: NOW, mocks: {}, drills: {} }).map((r) => r.kind);
    expect(kinds('A1')).toEqual(['listening', 'reading', 'writing', 'speaking']);
    expect(kinds('B1')).toEqual(['listening', 'reading', 'writing', 'speaking']);
    expect(kinds('B2')).toEqual(['reading', 'writing', 'speaking']);
    expect(kinds('C1')).toEqual(['reading', 'writing', 'speaking']);
    const mocks = { reading: { pct: 65, finishedAt: NOW - DAY, provisional: false } };
    const at = (level: 'B1' | 'B2') =>
      computeReadiness({ level, now: NOW, mocks, drills: {} }).find((r) => r.kind === 'reading')!;
    expect(at('B1').band).toBe('borderline'); // B1 threshold 70
    expect(at('B2').band).toBe('pass'); // B2 threshold 60
  });
  it('labels: yesterday and the Ukrainian plural of the answers', () => {
    const one = computeReadiness({
      now: NOW,
      mocks: { reading: { pct: 80, finishedAt: NOW - DAY, provisional: false } },
      drills: { listening: { answered: 1, correct: 1 } },
    });
    expect(one.find((r) => r.kind === 'reading')!.label).toBe('пробний іспит учора');
    expect(one.find((r) => r.kind === 'listening')!.label).toBe(
      'оцінка за тренуваннями · 1 відповідь',
    );
    const two = computeReadiness({
      now: NOW,
      mocks: {},
      drills: { listening: { answered: 3, correct: 1 } },
    });
    expect(two.find((r) => r.kind === 'listening')!.label).toBe(
      'оцінка за тренуваннями · 3 відповіді',
    );
  });
  it('same-day mock reads «сьогодні»', () => {
    const rows = computeReadiness({
      now: NOW,
      mocks: { reading: { pct: 80, finishedAt: NOW - 1000, provisional: false } },
      drills: {},
    });
    expect(rows.find((r) => r.kind === 'reading')!.label).toBe('пробний іспит сьогодні');
  });
});

describe('latestMockPcts', () => {
  const attempt = (
    finishedAt: number,
    results: Record<string, number>,
    over: Partial<MockAttemptLike> = {},
  ): MockAttemptLike => ({
    status: 'finished',
    mode: 'mock',
    finishedAt,
    results: Object.fromEntries(
      Object.entries(results).map(([id, pct]) => [
        id,
        { points: pct, maxPoints: 100, pct, provisional: false, gradedBy: 'offline' as const },
      ]),
    ),
    state: {
      subtests: [
        { id: 'lex', kind: 'lexgram' },
        { id: 'read', kind: 'reading' },
      ],
    },
    ...over,
  });
  it('picks the newest finished MOCK per kind, mapping ids to kinds through the state', () => {
    const out = latestMockPcts([
      attempt(100, { lex: 50 }),
      attempt(300, { lex: 70, read: 80 }),
      attempt(200, { lex: 60 }),
    ]);
    expect(out.lexgram).toMatchObject({ pct: 70, finishedAt: 300 });
    expect(out.reading).toMatchObject({ pct: 80 });
  });
  it('ignores drills, unfinished attempts and unreadable results; accepts kind-named ids', () => {
    expect(latestMockPcts([attempt(1, { lex: 50 }, { mode: 'drill' })])).toEqual({});
    expect(latestMockPcts([attempt(1, { lex: 50 }, { status: 'abandoned' })])).toEqual({});
    expect(latestMockPcts([attempt(1, { lex: 50 }, { results: null })])).toEqual({});
    expect(latestMockPcts([attempt(5, { speaking: 62 }, { state: null })]).speaking?.pct).toBe(62);
    expect(latestMockPcts([attempt(5, { weird: 62 }, { state: null })])).toEqual({});
  });
});

describe('weakestTopic + recommendToday', () => {
  const stats = [
    { topic: 'case-gen', answered: 10, correct: 4 },
    { topic: 'case-prep', answered: 10, correct: 9 },
    { topic: 'conj', answered: 2, correct: 0 }, // too few answers to judge
  ];
  const readTopics = new Set(['case-gen', 'case-prep', 'conj']);
  it('weakest = lowest accuracy among topics with ≥ 3 answers', () => {
    expect(weakestTopic(stats, readTopics)?.topic).toBe('case-gen');
    expect(weakestTopic(stats, new Set(['conj']))).toBeNull();
  });
  const base = {
    rows: rowsOf({ reading: 50, listening: 75 }),
    topicsByKind: { reading: readTopics },
    topicStats: stats,
    deckDue: 0,
    lastMockAt: null,
    now: NOW,
    mockInstalled: true,
  };
  it('1. weakest topic of the weakest objective subtest under the threshold', () => {
    expect(recommendToday(base)).toEqual({
      kind: 'topic',
      subtestKind: 'reading',
      topic: 'case-gen',
      accuracy: 40,
    });
  });
  it('2. due deck items when no weak topic is nameable', () => {
    expect(recommendToday({ ...base, topicStats: [], deckDue: 7 })).toEqual({
      kind: 'deck',
      due: 7,
    });
  });
  it('3. «time for a mock» when none in 7 days and every objective subtest within 10 points of the threshold', () => {
    const rows = rowsOf({ reading: 75, listening: 75 });
    expect(recommendToday({ ...base, rows })).toEqual({ kind: 'mock' });
    expect(recommendToday({ ...base, rows, lastMockAt: NOW - 2 * DAY })?.kind).not.toBe('mock');
    expect(recommendToday({ ...base, rows, mockInstalled: false })?.kind).not.toBe('mock');
    // an unknown objective subtest blocks it
    expect(recommendToday({ ...base, rows: rowsOf({ reading: 75 }) })?.kind).not.toBe('mock');
  });
  it('4. falls back to the weakest topic anywhere, then the first drill', () => {
    const rows = rowsOf({ reading: 75, listening: 75 });
    expect(recommendToday({ ...base, rows, lastMockAt: NOW })).toMatchObject({
      kind: 'topic',
      topic: 'case-gen',
    });
    expect(recommendToday({ ...base, rows, lastMockAt: NOW, topicStats: [] })).toEqual({
      kind: 'start',
      subtestKind: 'reading',
    });
    expect(recommendToday({ ...base, topicsByKind: {}, topicStats: [] })).toBeNull();
  });
  it('passPct moves the weak / mock edges (B2: 60)', () => {
    const rows = rowsOf({ reading: 65, listening: 65 });
    // at the default 70 both are weak → a topic step; at 60 neither is
    expect(recommendToday({ ...base, rows })?.kind).toBe('topic');
    expect(recommendToday({ ...base, rows, passPct: 60, topicStats: [], deckDue: 0 })).toEqual({
      kind: 'mock',
    });
  });
});
