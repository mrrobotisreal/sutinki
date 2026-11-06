import {
  ExamSchema,
  type ChoiceItem,
  type Exam,
  type MatchingItem,
  type TypedItem,
} from '@sutinki/schema';
import { a1TorflPack as examPackJson } from '@/features/torfl/__tests__/helpers/inline-exam';
import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';

import {
  LIGHTNING_ITEMS,
  PACE_SEC,
  averageSeconds,
  lightningPaceSec,
  paceFor,
  paceFraction,
  paceSecFor,
  ratingForDrillAnswer,
} from '../pace';
import {
  acceptedDisplay,
  itemMaxPoints,
  matchesPattern,
  matchingCorrect,
  normalizeAnswer,
  refSentenceIds,
  resolveAudioSpan,
  roundPct,
  scoreChoice,
  scoreItem,
  scoreMatching,
  scoreTyped,
  splitStemAtGap,
  subtestPercent,
} from '../scoring';

const PACK = examPackJson as unknown as { exams: unknown[] };
const EXAMS: Exam[] = PACK.exams.map((e) => ExamSchema.parse(e));
const drill = EXAMS.find((e) => e.mode === 'drill')!;
const mock = EXAMS.find((e) => e.mode === 'mock')!;

function typed(partial: Partial<TypedItem>): TypedItem {
  return {
    id: 't',
    topic: 'case-prep',
    kind: 'typed',
    prompt: 'Мати артистки була (ким?)',
    accept: ['художником'],
    half: ['художник'],
    ...partial,
  } as TypedItem;
}

describe('normalizeAnswer', () => {
  it('folds NFC, case, apostrophes, ґ, stress marks, punctuation and spaces', () => {
    expect(normalizeAnswer('  Ялинка,  ЗЕЛЕНА!  ')).toBe('ялинка зелена');
    expect(normalizeAnswer('мама́')).toBe('мама');
    expect(normalizeAnswer('«Привіт»…')).toBe('привіт');
    expect(normalizeAnswer("п'ять")).toBe(normalizeAnswer('п’ять'));
    expect(normalizeAnswer('п\u02BCять')).toBe(normalizeAnswer("п'ять"));
    expect(normalizeAnswer('ґанок')).toBe(normalizeAnswer('ганок'));
    // decomposed й (и + breve) composes under NFC and stays a letter
    expect(normalizeAnswer('й')).toBe('й');
  });
  it('keeps in-word hyphens, drops stray ones', () => {
    expect(normalizeAnswer('хтось-то')).toBe('хтось-то');
    expect(normalizeAnswer('- хтось-то -')).toBe('хтось-то');
  });
  it('is idempotent', () => {
    const once = normalizeAnswer('  Все,  ЦЕ — ялинка!  ');
    expect(normalizeAnswer(once)).toBe(once);
  });
});

describe('matchesPattern (trailing-* globs)', () => {
  it('exact without a star, prefix with one', () => {
    expect(matchesPattern('парку', 'парку')).toBe(true);
    expect(matchesPattern('парку', 'парки')).toBe(false);
    expect(matchesPattern('робіт*', 'робітник')).toBe(true);
    expect(matchesPattern('робіт*', 'робітниця')).toBe(true);
    expect(matchesPattern('робіт*', 'роб')).toBe(false);
  });
  it('normalizes the pattern too (apostrophe, ґ, case)', () => {
    expect(matchesPattern("П'ят*", normalizeAnswer('п’ятниця'))).toBe(true);
    expect(matchesPattern('Ґанок*', 'ганок')).toBe(true);
  });
  it('a bare star never matches everything', () => {
    expect(matchesPattern('*', 'що завгодно')).toBe(false);
  });
});

describe('scoreChoice', () => {
  const item = {
    id: 'c',
    kind: 'choice',
    topic: 'conj',
    stem: 'х …',
    options: ['а', 'б', 'в'],
    answer: 1,
  } as ChoiceItem;
  it('full on the right index, 0 on a wrong one, blank on null', () => {
    expect(scoreChoice(item, 1, 4)).toEqual({ points: 4, maxPoints: 4, outcome: 'full' });
    expect(scoreChoice(item, 0, 4)).toEqual({ points: 0, maxPoints: 4, outcome: 'wrong' });
    expect(scoreChoice(item, null, 4)).toEqual({ points: 0, maxPoints: 4, outcome: 'blank' });
  });
});

describe('scoreTyped (demo v1 half credit)', () => {
  const item = typed({});
  it('«художником» is full, «художник» half of 5, anything else 0', () => {
    expect(scoreTyped(item, 'художником', 5)).toEqual({ points: 5, maxPoints: 5, outcome: 'full' });
    expect(scoreTyped(item, 'Художником.', 5).outcome).toBe('full');
    expect(scoreTyped(item, 'художник', 5)).toEqual({ points: 2.5, maxPoints: 5, outcome: 'half' });
    expect(scoreTyped(item, 'врачом', 5)).toEqual({ points: 0, maxPoints: 5, outcome: 'wrong' });
    expect(scoreTyped(item, '   ', 5).outcome).toBe('blank');
  });
  it('is apostrophe / ґ tolerant on accept and half', () => {
    const e = typed({ accept: ["м'яко"], half: ['ґанок'] });
    expect(scoreTyped(e, 'м’яко', 1).outcome).toBe('full');
    expect(scoreTyped(e, 'мʼяко', 1).outcome).toBe('full');
    expect(scoreTyped(e, 'ганок', 2).points).toBe(1);
  });
  it('globs in accept and half', () => {
    const g = typed({ accept: ['студент*'], half: ['учени*'] });
    expect(scoreTyped(g, 'студентка', 1).outcome).toBe('full');
    expect(scoreTyped(g, 'ученица', 1).outcome).toBe('half');
  });
  it('accept beats half when both match', () => {
    const both = typed({ accept: ['парк*'], half: ['парк'] });
    expect(scoreTyped(both, 'парк', 1).outcome).toBe('full');
  });
  it('the fixture drill item dr06: парке full, парк / парку half', () => {
    const dr06 = drill.subtests[0]!.parts[0]!.items.find((i) => i.id === 'dr06') as TypedItem;
    expect(scoreTyped(dr06, 'парке', 1).outcome).toBe('full');
    expect(scoreTyped(dr06, 'парк', 1).outcome).toBe('half');
    expect(scoreTyped(dr06, 'парку', 1).points).toBe(0.5);
    expect(scoreTyped(dr06, 'лес', 1).outcome).toBe('wrong');
  });
});

describe('acceptedDisplay', () => {
  it('shows the first accept; a glob star becomes an ellipsis', () => {
    expect(acceptedDisplay(typed({ accept: ['парке', 'в парке'] }))).toBe('парке');
    expect(acceptedDisplay(typed({ accept: ['студент*'] }))).toBe('студент…');
  });
});

describe('itemMaxPoints / scoreItem', () => {
  const lex = mock.subtests.find((s) => s.kind === 'lexgram')!;
  const reading = mock.subtests.find((s) => s.kind === 'reading')!;
  it('uses the subtest pointsPerItem, an item override wins', () => {
    const lg = lex.parts[0]!.items[0]!;
    const rd = reading.parts[0]!.items[0]!;
    expect(itemMaxPoints(lg, lex)).toBe(1);
    expect(itemMaxPoints(rd, reading)).toBe(4);
    expect(itemMaxPoints({ ...lg, points: 3 }, lex)).toBe(3);
  });
  it('scores choice by index and typed by text; rubric kinds → null', () => {
    const lg = lex.parts[0]!.items[0]! as ChoiceItem;
    expect(scoreItem(lg, { index: lg.answer }, lex)?.outcome).toBe('full');
    expect(scoreItem(lg, { index: (lg.answer + 1) % lg.options.length }, lex)?.outcome).toBe(
      'wrong',
    );
    const wr = mock.subtests.find((s) => s.kind === 'writing')!;
    expect(scoreItem(wr.parts[0]!.items[0]!, { text: 'Привіт' }, wr)).toBeNull();
    // mismatched answer shape for the kind
    expect(scoreItem(lg, { text: 'x' }, lex)).toBeNull();
  });
});

describe('subtestPercent + rounding', () => {
  it('Σ points / maxPoints × 100 with one decimal', () => {
    expect(subtestPercent([{ points: 1 }, { points: 1 }, { points: 0 }], { maxPoints: 3 })).toBe(
      66.7,
    );
    expect(subtestPercent([{ points: 47 }], { maxPoints: 70 })).toBe(67.1);
  });
  it('unanswered items add 0: the denominator is the subtest max, not the answered count', () => {
    expect(subtestPercent([{ points: 5 }], { maxPoints: 100 })).toBe(5);
    expect(subtestPercent([], { maxPoints: 70 })).toBe(0);
    expect(subtestPercent([{ points: null }], { maxPoints: 70 })).toBe(0);
  });
  it('half credits count; clamps to 0–100; guards a zero max', () => {
    expect(subtestPercent([{ points: 2.5 }, { points: 5 }], { maxPoints: 10 })).toBe(75);
    expect(subtestPercent([{ points: 99 }], { maxPoints: 10 })).toBe(100);
    expect(subtestPercent([{ points: 1 }], { maxPoints: 0 })).toBe(0);
  });
  it('rounds half away from zero at one decimal (66.65 → 66.7)', () => {
    expect(roundPct(66.65)).toBe(66.7);
    expect(roundPct(66.649)).toBe(66.6);
    expect(roundPct(0)).toBe(0);
  });
});

describe('stem + refs helpers', () => {
  it('splits a stem at its single gap', () => {
    expect(splitStemAtGap('Кирилл работает … радио.')).toEqual({
      before: 'Кирилл работает ',
      gap: '…',
      after: ' радио.',
    });
    expect(splitStemAtGap('Я ___ дома.').gap).toBe('___');
    expect(splitStemAtGap('Я живу дома.')).toEqual({
      before: 'Я живу дома.',
      gap: null,
      after: '',
    });
  });
  it('refSentenceIds: whole story, a run, and ids a pack update removed', () => {
    const all = ['s1', 's2', 's3', 's4'];
    expect(refSentenceIds({}, all)).toEqual(all);
    expect(refSentenceIds({ sentenceIds: ['s2', 's3'] }, all)).toEqual(['s2', 's3']);
    expect(refSentenceIds({ sentenceIds: ['gone'] }, all)).toEqual([]);
  });
  it('resolveAudioSpan: first stamp − 150, last stamp + 250, clamped; whole track when no ids', () => {
    const stamps = [
      { sentenceId: 's1', startMs: 100, endMs: 500 },
      { sentenceId: 's2', startMs: 1000, endMs: 1600 },
      { sentenceId: 's2', startMs: 1700, endMs: 2300 },
      { sentenceId: 's3', startMs: 2500, endMs: 3000 },
    ];
    expect(resolveAudioSpan({ sentenceIds: ['s2'] }, stamps, 5000)).toEqual({
      startMs: 850,
      endMs: 2550,
    });
    expect(resolveAudioSpan({ sentenceIds: ['s1'] }, stamps, 5000)).toEqual({
      startMs: 0,
      endMs: 750,
    });
    expect(resolveAudioSpan({ sentenceIds: ['s3'] }, stamps, 3100)).toEqual({
      startMs: 2350,
      endMs: 3100,
    });
    expect(resolveAudioSpan({}, stamps, 5000)).toEqual({ startMs: 0, endMs: 5000 });
    expect(resolveAudioSpan({ sentenceIds: ['nope'] }, stamps, 5000)).toBeNull();
  });
});

describe('pace constants + the drill grading rule', () => {
  it('are the real A1 state-exam paces: section minutes × 60 ÷ items', () => {
    expect(PACE_SEC).toEqual({ lexgram: 30, reading: 113, listening: 60 });
    expect(PACE_SEC).toBe(paceFor('A1'));
    expect(LIGHTNING_ITEMS).toBe(20);
    expect(paceSecFor('writing')).toBeNull();
    expect(paceSecFor('speaking')).toBeNull();
    expect(paceSecFor('lexgram')).toBe(30);
  });
  it('wrong / blank = Again regardless of speed', () => {
    expect(ratingForDrillAnswer('wrong', 1000, 'lexgram')).toBe(Rating.Again);
    expect(ratingForDrillAnswer('blank', 1000, 'reading')).toBe(Rating.Again);
  });
  it('correct ≤ 2× pace = Good, slower = Hard (per kind)', () => {
    expect(ratingForDrillAnswer('full', 60_000, 'lexgram')).toBe(Rating.Good);
    expect(ratingForDrillAnswer('full', 60_001, 'lexgram')).toBe(Rating.Hard);
    expect(ratingForDrillAnswer('full', 226_000, 'reading')).toBe(Rating.Good);
    expect(ratingForDrillAnswer('full', 226_001, 'reading')).toBe(Rating.Hard);
    expect(ratingForDrillAnswer('full', 120_000, 'listening')).toBe(Rating.Good);
    expect(ratingForDrillAnswer('full', 120_001, 'listening')).toBe(Rating.Hard);
  });
  it('half credit is Hard even when fast; never Easy', () => {
    expect(ratingForDrillAnswer('half', 1000, 'lexgram')).toBe(Rating.Hard);
    for (const o of ['full', 'half', 'wrong', 'blank'] as const) {
      expect(ratingForDrillAnswer(o, 500, 'lexgram')).not.toBe(Rating.Easy);
    }
  });
  it('pace helpers', () => {
    expect(paceFraction(15_000, 30)).toBe(0.5);
    expect(paceFraction(-5, 30)).toBe(0);
    expect(paceFraction(100, 0)).toBe(0);
    expect(averageSeconds(600_000, 20)).toBe(30);
    expect(averageSeconds(0, 0)).toBe(0);
  });
  it('UT16b: per-level pace rows, the level drill rule, and the A1 default', () => {
    expect(paceFor('A2')).toEqual({ lexgram: 30, reading: 123, listening: 66 });
    expect(paceFor('B1')).toEqual({ lexgram: 30, reading: 116, listening: 75 });
    expect(paceSecFor('lexgram', 'A2')).toBe(30);
    expect(paceSecFor('listening', 'A2')).toBe(66);
    expect(paceSecFor('writing', 'A2')).toBeNull();
    expect(lightningPaceSec('A2')).toBe(30);
    expect(lightningPaceSec()).toBe(30);
    expect(ratingForDrillAnswer('full', 132_000, 'listening', 'A2')).toBe(Rating.Good);
    expect(ratingForDrillAnswer('full', 132_001, 'listening', 'A2')).toBe(Rating.Hard);
    expect(ratingForDrillAnswer('full', 60_000, 'lexgram')).toBe(Rating.Good);
    expect(ratingForDrillAnswer('full', 60_001, 'lexgram')).toBe(Rating.Hard);
  });
});

describe('scoreMatching (per-pair partial credit)', () => {
  const item = {
    id: 'm',
    topic: 'rd-heading',
    kind: 'matching',
    stem: 'Підберіть заголовки',
    left: ['Абзац 1', 'Абзац 2', 'Абзац 3', 'Абзац 4'],
    right: ['A', 'B', 'C', 'D', 'E', 'F'],
    key: [2, 0, 4, 1],
  } as MatchingItem;

  it('all pairs right = full', () => {
    expect(scoreMatching(item, [2, 0, 4, 1], 8)).toEqual({
      points: 8,
      maxPoints: 8,
      outcome: 'full',
    });
  });
  it('some pairs right = half with proportional points', () => {
    expect(scoreMatching(item, [2, 0, 3, 5], 8)).toEqual({
      points: 4,
      maxPoints: 8,
      outcome: 'half',
    });
    expect(scoreMatching(item, [2, null, null, null], 8)).toEqual({
      points: 2,
      maxPoints: 8,
      outcome: 'half',
    });
  });
  it('none right = wrong; nothing picked = blank', () => {
    expect(scoreMatching(item, [0, 1, 2, 3], 8)).toEqual({
      points: 0,
      maxPoints: 8,
      outcome: 'wrong',
    });
    expect(scoreMatching(item, [null, null, null, null], 8)).toEqual({
      points: 0,
      maxPoints: 8,
      outcome: 'blank',
    });
    expect(scoreMatching(item, [], 8).outcome).toBe('blank');
  });
  it('matchingCorrect marks each pair', () => {
    expect(matchingCorrect(item, [2, 1, 4, null])).toEqual([true, false, true, false]);
  });
  it('scoreItem routes {picks} to matching and rejects other shapes', () => {
    expect(scoreItem(item, { picks: [2, 0, 4, 1] }, { pointsPerItem: 1 })?.outcome).toBe('full');
    expect(scoreItem(item, { index: 1 }, { pointsPerItem: 1 })).toBeNull();
  });
});
