import { ExamSchema, type Exam, type Pack } from '@sutinki/schema';
import { a1TorflPack as examPackJson } from '@/features/torfl/__tests__/helpers/inline-exam';
import { describe, expect, it } from 'vitest';

import { initialRunState, reduce, type ExamRunState } from '../engine/exam-machine';
import { computeFinish } from '../engine/finish';
import { dictionaryAllowed, devDurationOverrideSec, formatClock, timerTone } from '../engine/rules';
import type { ExamAnswer } from '../model';
import { DEFAULT_TORFL_PREFS } from '../settings-core';
import ukPackJson from '@sutinki/schema/fixtures/packs/a1-ukrexam-fixture/pack.json';

const PACK = examPackJson as unknown as Pack;
const EXAM: Exam = ExamSchema.parse(PACK.exams!.find((e) => e.id === 'a1-mock-fx'));
/** The Ukrainian four-section fixture mock (ls · rd · wr 33 · sp 38). */
const UK: Exam = ExamSchema.parse(
  (ukPackJson as unknown as Pack).exams!.find((e) => e.id === 'a1-mock-fx'),
);
const T0 = 1_790_000_000_000;
const choice = (index: number | null): ExamAnswer => ({ kind: 'choice', index });

/** Drive every subtest to submitted; `skip` names subtests submitted from their instruction screen (recorded skipped). */
function submitted(ids: string[], skip: string[] = [], exam: Exam = EXAM): ExamRunState {
  let state = initialRunState(exam, ids);
  const ctx = { exam, breakBetween: false };
  state = reduce(ctx, state, { type: 'START', now: T0 }).state;
  for (let i = 0; i < ids.length; i++) {
    const cur = state.subtests[state.current]!;
    if (state.phase === 'instructions' && !skip.includes(cur.id))
      state = reduce(ctx, state, { type: 'BEGIN', now: T0 }).state;
    state = reduce(ctx, state, { type: 'SUBMIT_SUBTEST', now: T0 + 1000 }).state;
  }
  return state;
}

describe('computeFinish', () => {
  it('scores lexgram: 5 items × 1, answers right/wrong/blank; pct over maxPoints 5', () => {
    const lex = EXAM.subtests.find((s) => s.id === 'lexgram')!;
    const items = lex.parts.flatMap((p) => p.items);
    const answers: Record<string, ExamAnswer> = {};
    // first two right, third wrong, fourth blank-choice, fifth absent
    for (const [i, item] of items.entries()) {
      if (item.kind !== 'choice') continue;
      if (i < 2) answers[item.id] = choice(item.answer);
      else if (i === 2) answers[item.id] = choice((item.answer + 1) % item.options.length);
      else if (i === 3) answers[item.id] = choice(null);
    }
    const f = computeFinish(EXAM, submitted(['lexgram']), answers, 'subtest');
    expect(f.results.lexgram).toEqual({
      points: 2,
      maxPoints: 5,
      pct: 40,
      provisional: false,
      gradedBy: 'offline',
    });
    expect(f.verdict).toBeNull();
    expect(f.missed.map((m) => [m.itemId, m.outcome])).toEqual([
      ['lg03', 'wrong'],
      ['lg04', 'blank'],
      ['lg05', 'blank'],
    ]);
  });

  it('a full mock with writing + speaking skipped: three results, NO verdict, skipped excluded (not 0 %)', () => {
    const all = EXAM.subtests.map((s) => s.id);
    const answers: Record<string, ExamAnswer> = {};
    for (const s of EXAM.subtests) {
      if (!['lexgram', 'reading', 'listening'].includes(s.kind)) continue;
      for (const item of s.parts.flatMap((p) => p.items)) {
        if (item.kind === 'choice') answers[item.id] = choice(item.answer);
      }
    }
    const f = computeFinish(EXAM, submitted(all, ['writing', 'speaking']), answers, 'full');
    expect(Object.keys(f.results).sort()).toEqual(['listening', 'lexgram', 'reading'].sort());
    expect(f.pcts).toEqual({ lexgram: 100, reading: 100, listening: 100 });
    expect(f.verdict?.verdict).toBeNull();
    expect(f.verdict?.missing).toEqual(['writing', 'speaking']);
    expect(f.missed).toEqual([]);
  });

  it('UT17b: a submitted writing section is scored offline over 33 → provisional, gradedBy offline, no deck entries', () => {
    const message =
      'Привіт, Оксано!\nМене звати Мітч. Я живу в Колорадо і працюю вдома.\nДо зустрічі!';
    const text =
      'Мене звати Мітч, мені тридцять шість років. Я живу в Колорадо з моєю нареченою. Вона українка.\nМи часто гуляємо в парку, читаємо книжки та готуємо вечерю. Мені дуже подобається наше життя тут.';
    const f = computeFinish(
      UK,
      submitted(['wr'], [], UK),
      { wr44: { kind: 'writing', text: message }, wr45: { kind: 'writing', text } },
      'subtest',
    );
    expect(f.results.wr).toEqual({
      points: 33,
      maxPoints: 33,
      pct: 100,
      provisional: true,
      gradedBy: 'offline',
    });
    expect(f.missed).toEqual([]);
    // Only the 23-point text answered: 23 of 33 = 69.7 %.
    const textOnly = computeFinish(
      UK,
      submitted(['wr'], [], UK),
      { wr45: { kind: 'writing', text } },
      'subtest',
    );
    expect(textOnly.results.wr).toMatchObject({ points: 23, maxPoints: 33, pct: 69.7 });
    // An empty text is a real 0 % (not skipped): the candidate sat the section.
    const empty = computeFinish(UK, submitted(['wr'], [], UK), {}, 'subtest');
    expect(empty.results.wr).toMatchObject({ pct: 0, provisional: true });
    // Three scored + writing provisional → verdict null (speaking missing), missing = ['speaking'].
    const all = UK.subtests.map((x) => x.id);
    const answers: Record<string, ExamAnswer> = {
      wr44: { kind: 'writing', text: message },
      wr45: { kind: 'writing', text },
    };
    for (const sec of UK.subtests) {
      for (const item of sec.parts.flatMap((p) => p.items)) {
        if (item.kind === 'choice') answers[item.id] = choice(item.answer);
      }
    }
    const part = computeFinish(UK, submitted(all, ['sp'], UK), answers, 'full');
    expect(Object.keys(part.results).sort()).toEqual(['ls', 'rd', 'wr']);
    expect(part.verdict?.verdict).toBeNull();
    expect(part.verdict?.missing).toEqual(['speaking']);
  });

  it('UT17b: a submitted speaking section is scored offline over 38; with all four sat the verdict appears (provisional)', () => {
    const answers: Record<string, ExamAnswer> = {
      sp46: {
        kind: 'speaking-reply',
        transcript: 'Мене звати Оксана',
        recordingPath: null,
        durationMs: 1,
      },
      sp47: {
        kind: 'speaking-reply',
        transcript: 'Я живу в Києві',
        recordingPath: null,
        durationMs: 1,
      },
      sp48: {
        kind: 'speaking-reply',
        transcript: 'Я люблю читати',
        recordingPath: null,
        durationMs: 1,
      },
      sp45: {
        kind: 'speaking-monologue',
        transcript: 'мене звати мітч я живу в колорадо я працюю я люблю читати',
        recordingPath: null,
        durationMs: 1,
      },
    };
    const f = computeFinish(UK, submitted(['sp'], [], UK), answers, 'subtest');
    const sp = f.results.sp!;
    expect(sp.maxPoints).toBe(38);
    expect(sp.provisional).toBe(true);
    expect(sp.gradedBy).toBe('offline');
    expect(sp.pct).toBeCloseTo((sp.points / 38) * 100, 0);
    expect(sp.points).toBeGreaterThan(0);
    expect(f.missed).toEqual([]);
    // Nothing recorded is a real 0 % (the candidate sat the section), never skipped.
    expect(computeFinish(UK, submitted(['sp'], [], UK), {}, 'subtest').results.sp).toMatchObject({
      pct: 0,
      provisional: true,
    });
    // All four sat → the verdict, provisional while writing / speaking are offline-graded.
    const all = UK.subtests.map((x) => x.id);
    const every: Record<string, ExamAnswer> = {
      ...answers,
      wr44: {
        kind: 'writing',
        text: 'Привіт!\nМене звати Мітч. Я живу в Колорадо і працюю вдома.\nДо зустрічі!',
      },
      wr45: {
        kind: 'writing',
        text: 'Мене звати Мітч, мені тридцять шість років. Я живу в Колорадо з моєю нареченою. Вона українка.\nМи часто гуляємо в парку, читаємо книжки та готуємо вечерю. Мені дуже подобається наше життя тут.',
      },
    };
    for (const sec of UK.subtests) {
      for (const item of sec.parts.flatMap((p) => p.items)) {
        if (item.kind === 'choice') every[item.id] = choice(item.answer);
      }
    }
    const four = computeFinish(UK, submitted(all, [], UK), every, 'full');
    expect(Object.keys(four.results).sort()).toEqual(['ls', 'rd', 'sp', 'wr']);
    expect(four.verdict?.missing).toEqual([]);
    expect(four.verdict?.provisional).toBe(true);
    expect(['pass', 'fail']).toContain(four.verdict?.verdict);
  });

  it('an unsubmitted subtest is not scored', () => {
    const f = computeFinish(EXAM, initialRunState(EXAM, ['lexgram']), {}, 'subtest');
    expect(f.results).toEqual({});
  });
});

describe('dictionary rule', () => {
  const on = DEFAULT_TORFL_PREFS;
  const off = { ...DEFAULT_TORFL_PREFS, allowLookupInMockReading: false };
  it('lookup only where the paper dictionary is allowed AND the pref is on', () => {
    expect(dictionaryAllowed({ dictionary: true }, on)).toBe(true);
    expect(dictionaryAllowed({ dictionary: true }, off)).toBe(false);
    expect(dictionaryAllowed({ dictionary: false }, on)).toBe(false);
  });
  it('mapping over the fixture: reading yes; lexgram + listening no', () => {
    const by = (id: string) =>
      dictionaryAllowed(
        EXAM.subtests.find((s) => s.id === id)!,
        on,
      );
    expect([by('reading'), by('lexgram'), by('listening')]).toEqual([true, false, false]);
  });
});

describe('dev duration override never reaches release', () => {
  it('release (__DEV__ false) ignores any value; dev honours valid whole seconds only', () => {
    expect(devDurationOverrideSec('60', false)).toBeUndefined();
    expect(devDurationOverrideSec('60', true)).toBe(60);
    expect(devDurationOverrideSec('4', true)).toBeUndefined();
    expect(devDurationOverrideSec('abc', true)).toBeUndefined();
    expect(devDurationOverrideSec('9999', true)).toBeUndefined();
    expect(devDurationOverrideSec(undefined, true)).toBeUndefined();
  });
});

describe('timer', () => {
  it('formats mm:ss rounding up, never negative', () => {
    expect(formatClock(40 * 60_000)).toBe('40:00');
    expect(formatClock(59_001)).toBe('01:00');
    expect(formatClock(-5)).toBe('00:00');
  });
  it('amber at ≤ 5:00, red at ≤ 1:00', () => {
    expect(timerTone(300_001)).toBe('normal');
    expect(timerTone(300_000)).toBe('amber');
    expect(timerTone(60_001)).toBe('amber');
    expect(timerTone(60_000)).toBe('red');
  });
});
