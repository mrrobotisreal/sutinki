import { ExamSchema, type Exam } from '@sutinki/schema';
import examPack from '@sutinki/schema/fixtures/packs/a1-ukrexam-fixture/pack.json';
import { describe, expect, it, vi } from 'vitest';

import { scoreWritingSubtest } from '../engine/finish';
import { recomputeResults, type GradingJobInput } from '../grading/queue-core';
import { WRITING_TASK_POINTS } from '../grading/rubrics';
import { criterionLabel, gradeWritingOffline, offlineItemScore } from '../grading/writing';
import { writingGrader } from '../grading/writing-grader';
import type { ExamAnswer, ExamGrading } from '../model';
import {
  countersLine,
  isNoteTopic,
  writingCounters,
  writingItemsOf,
  writingShare,
} from '../writing/writing-model';

vi.mock('@/services/analytics', () => ({ track: vi.fn() }));

const EXAM: Exam = ExamSchema.parse(
  (examPack as unknown as { exams: unknown[] }).exams.find(
    (e) => (e as { id: string }).id === 'a1-mock-fx',
  ),
);
const st = EXAM.subtests.find((s) => s.kind === 'writing')!;
const [MSG, TEXT] = writingItemsOf(st);

const MESSAGE = 'Привіт, Оксано!\nМене звати Мітч. Я живу в Колорадо і працюю вдома.\nДо зустрічі!';
const LONG_TEXT =
  'Мене звати Мітч, мені тридцять шість років. Я живу в Колорадо з моєю нареченою.\nВона українка. Ми часто гуляємо в парку, читаємо книжки та готуємо вечерю. Мені дуже подобається наше життя.';

describe('writingShare (Commission points 10 + 23 of 33)', () => {
  it('the fixture section has the message (task 44) and the text (task 45)', () => {
    expect(MSG!.topic).toBe('wr-message');
    expect(TEXT!.topic).toBe('wr-text');
    expect(st.maxPoints).toBe(WRITING_TASK_POINTS.message + WRITING_TASK_POINTS.text);
  });

  it('a response share is its Commission points scaled to maxPoints; shares sum to maxPoints', () => {
    const m = writingShare(st, MSG);
    const t = writingShare(st, TEXT);
    expect(m).toBeCloseTo(10, 2);
    expect(t).toBeCloseTo(23, 2);
    expect(m + t).toBeCloseTo(st.maxPoints, 2);
    // without an item: the mean share
    expect(writingShare(st)).toBeCloseTo(st.maxPoints / 2, 2);
  });

  it('a lone writing item keeps the whole section; a different maxPoints scales proportionally', () => {
    const one = { maxPoints: 33, parts: [{ items: [TEXT!] }] } as never;
    expect(writingShare(one, TEXT)).toBe(33);
    const scaled = { ...st, maxPoints: 66 };
    expect(writingShare(scaled, MSG)).toBeCloseTo(20, 2);
  });

  it('scoreWritingSubtest: Σ pct × share over the two tasks, out of 33', () => {
    const answers: Record<string, ExamAnswer> = {
      wr44: { kind: 'writing', text: MESSAGE },
      wr45: { kind: 'writing', text: LONG_TEXT },
    };
    const r = scoreWritingSubtest(st, answers);
    const m = gradeWritingOffline(MSG as never, MESSAGE).pct;
    const t = gradeWritingOffline(TEXT as never, LONG_TEXT).pct;
    expect(r.points).toBeCloseTo(
      Math.round(((m / 100) * writingShare(st, MSG) + (t / 100) * writingShare(st, TEXT)) * 10) /
        10,
      1,
    );
    expect(r.maxPoints).toBe(33);
    expect(r.pct).toBeLessThanOrEqual(100);
    expect(r.provisional).toBe(true);
    expect(scoreWritingSubtest(st, {}).pct).toBe(0);
  });
});

describe('recomputeResults with two writing rows', () => {
  const offline = (item: string, text: string): ExamGrading => {
    const it = st.parts.flatMap((p) => p.items).find((i) => i.id === item) as never;
    const g = gradeWritingOffline(it, text);
    return { v: 1, offline: { criteria: g.criteria, details: { ...g.details } } };
  };
  const ai = (g: ExamGrading): ExamGrading => ({
    ...g,
    ai: {
      criteria: [{ id: 'content', score: 100, max: 100 }],
      corrected: '',
      changes: [],
      tips: [],
      provider: 'x',
      model: 'm',
      quality: 'normal',
      effort: 'high',
      gradedAt: 1,
    },
  });
  const row = (itemGrading: ExamGrading, status: string, points: number, maxPoints: number) => ({
    subtestId: st.id,
    points,
    maxPoints,
    gradingStatus: status,
    grading: itemGrading,
  });

  it('both offline: provisional, points sum over the section (never doubled)', () => {
    const r = recomputeResults(
      EXAM,
      null,
      [
        row(offline('wr44', MESSAGE), 'provisional', 8, 10),
        row(offline('wr45', LONG_TEXT), 'provisional', 20, 23),
      ],
      'full',
    );
    expect(r.results[st.id]).toMatchObject({
      points: 28,
      maxPoints: 33,
      provisional: true,
      gradedBy: 'offline',
    });
    expect(r.results[st.id]!.pct).toBeCloseTo((28 / 33) * 100, 0);
  });

  it('one AI + one offline: still provisional', () => {
    const r = recomputeResults(
      EXAM,
      null,
      [
        row(ai(offline('wr44', MESSAGE)), 'scored', 9, 10),
        row(offline('wr45', LONG_TEXT), 'provisional', 10, 23),
      ],
      'full',
    );
    expect(r.results[st.id]).toMatchObject({ points: 19, provisional: true });
  });

  it('one AI + one AI-failed: provisional, the failed row keeps its offline points', () => {
    const r = recomputeResults(
      EXAM,
      null,
      [
        row(ai(offline('wr44', MESSAGE)), 'scored', 9, 10),
        row(offline('wr45', LONG_TEXT), 'ai-failed', 12, 23),
      ],
      'full',
    );
    expect(r.results[st.id]).toMatchObject({ points: 21, provisional: true });
  });

  it('both AI: final', () => {
    const r = recomputeResults(
      EXAM,
      null,
      [
        row(ai(offline('wr44', MESSAGE)), 'scored', 10, 10),
        row(ai(offline('wr45', LONG_TEXT)), 'scored', 23, 23),
      ],
      'full',
    );
    expect(r.results[st.id]).toMatchObject({
      points: 33,
      maxPoints: 33,
      pct: 100,
      provisional: false,
      gradedBy: 'ai',
    });
  });
});

describe('writingGrader.fold scales by the row maxPoints', () => {
  it('a 23-point row: pct 80 → 18.4', () => {
    const job = { maxPoints: 23, grading: null } as unknown as GradingJobInput;
    const grade = {
      criteria: [
        { id: 'content', score: 20, max: 22 },
        { id: 'form', score: 4, max: 4 },
        { id: 'fit', score: 6, max: 9 },
        { id: 'coherence', score: 20, max: 26 },
        { id: 'norms', score: 20, max: 26 },
        { id: 'richness', score: 7, max: 9 },
        { id: 'volume', score: 3, max: 4 },
      ],
      corrected: 'x',
      changes: [],
      tips: [],
    };
    const w = writingGrader.fold({ exam: EXAM, job, storyText: async () => null }, grade as never, {
      provider: 'p',
      model: 'm',
      quality: 'normal',
      effort: 'high',
      gradedAt: 1,
      ms: 1,
    });
    expect(w.pct).toBe(80);
    expect(w.points).toBeCloseTo(18.4, 1);
  });
});

describe('the short message (wr-message)', () => {
  const msg = MSG as never as Parameters<typeof gradeWritingOffline>[0];
  const form = (g: ReturnType<typeof gradeWritingOffline>) =>
    g.criteria.find((c) => c.id === 'form')!.score;
  it('form: a greeting OR a sign-off earns the whole row', () => {
    expect(form(gradeWritingOffline(msg, 'Привіт! Мене звати Мітч і я живу тут.'))).toBe(10);
    expect(form(gradeWritingOffline(msg, 'Мене звати Мітч і я живу тут. Бувай!'))).toBe(10);
    expect(form(gradeWritingOffline(msg, 'Мене звати Мітч і я живу тут.'))).toBe(0);
  });
  it('bullets carry the content through the cue matcher', () => {
    const g = gradeWritingOffline(msg, MESSAGE);
    expect(g.details.pointsCovered).toBe(2);
    expect(g.pct).toBe(100);
    expect(gradeWritingOffline(msg, 'Привіт!').details.pointsCovered).toBe(0);
  });
  it('counter copy: no question quota line for a message with none; the quota shows otherwise', () => {
    const c = writingCounters(msg, 'Привіт. Бувай.');
    expect(countersLine(c, 'wr-message')).toBe('Речень: 2 / ≥ 1');
    expect(countersLine({ ...c, minQuestions: 1 })).toContain('Запитань');
    expect(isNoteTopic('wr-message')).toBe(true);
  });
  it('criterion labels are Ukrainian, topic-independent', () => {
    expect(criterionLabel('content').uk).toBe('Зміст');
    expect(criterionLabel('norms', 'wr-message').uk).toBe('Нормативність');
    expect(criterionLabel('coherence').uk).toBe("Логічність і зв'язність");
  });
  it('offlineItemScore over a 10-point row', () => {
    const g = gradeWritingOffline(msg, MESSAGE);
    expect(offlineItemScore(g, 10).points).toBeCloseTo((g.pct / 100) * 10, 1);
  });
});
