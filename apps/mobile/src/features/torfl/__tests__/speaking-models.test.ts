import { ExamSchema, type Exam, type Pack } from '@sutinki/schema';
import examPackJson from '@sutinki/schema/fixtures/packs/a1-ukrexam-fixture/pack.json';
import { describe, expect, it } from 'vitest';

import type { ExamResponse } from '@/db/repositories/exams';

import { gradeSpeakingOffline } from '../grading/speaking';
import {
  examScenarioRung,
  mergedSpeakingCriteria,
  speakingDebriefEntries,
  transcriptChips,
} from '../speaking/debrief-model';
import {
  drawTicket,
  monologueTickets,
  speakingPracticeEntries,
  speakingPracticeHref,
  ticketHref,
} from '../speaking/tickets-model';

/** T73: the pure debrief + practice / «Білети» derivations over the fixture mock. */

const PACK = examPackJson as unknown as Pack;
const summaries = PACK.exams!.map((e) => ({
  packId: PACK.id,
  examId: e.id,
  mode: e.mode,
  titleUk: e.title.uk,
  titleEn: e.title.en,
  exam: ExamSchema.parse(e) as Exam,
}));
const EXAM = summaries.find((s) => s.examId === 'a1-mock-fx')!.exam!;
const SPEAKING = EXAM.subtests.find((s) => s.kind === 'speaking')!;

function response(itemId: string, over: Partial<ExamResponse> = {}): ExamResponse {
  const item = SPEAKING.parts.flatMap((p) => p.items).find((i) => i.id === itemId)!;
  const answer = {
    kind: item.kind as 'speaking-reply',
    transcript: 'мене звати оксана',
    recordingPath: `t1-${itemId}.ogg`,
    durationMs: 2000,
  };
  const g = gradeSpeakingOffline(item, answer)!;
  return {
    id: `r-${itemId}`,
    attemptId: 'a1',
    subtestId: SPEAKING.id,
    itemId,
    answer,
    points: g.pct,
    maxPoints: 100,
    gradingStatus: 'provisional',
    grading: { v: 1, offline: { criteria: g.criteria, details: { ...g.details } } },
    durationMs: 2000,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

describe('speakingDebriefEntries', () => {
  it('one entry per item; each carries its rubric kind (photo · monologue · dialogue)', () => {
    const none = speakingDebriefEntries(EXAM, SPEAKING.id, []);
    expect(none.map((e) => [e.item.id, e.task, e.rubric, e.number, e.unchosen])).toEqual([
      ['sp44', 3, 'photo', 1, false],
      ['sp45', 3, 'monologue', 2, false],
      ['sp46', 1, 'dialogue', 3, false],
      ['sp47', 1, 'dialogue', 4, false],
      ['sp48', 1, 'dialogue', 5, false],
    ]);
    expect(none[2]!.modelLine).toBe('Мене звати Оксана.');
    expect(none[1]!.modelLine).toBeNull();
    expect(none[2]!.pct).toBeNull();
  });

  it('a graded reply: pct from points/max, the offline details, criteria merged with the AI-only parts pending', () => {
    const [e] = speakingDebriefEntries(EXAM, SPEAKING.id, [response('sp46')]).filter(
      (x) => x.item.id === 'sp46',
    );
    expect(e!.pct).toBe(100);
    expect(e!.details?.task).toBe(1);
    expect(e!.criteria.map((c) => [c.id, c.pending, c.source])).toEqual([
      ['content', false, 'offline'],
      ['accuracy', true, 'offline'],
      ['fullness', false, 'offline'],
      ['norms', true, 'offline'],
      ['range', true, 'offline'],
    ]);
    expect(transcriptChips(e!.answer)).toEqual(['мене', 'звати', 'оксана']);
    expect(transcriptChips({ ...e!.answer!, words: [{ w: 'Я', s: 0, e: 1 }] })).toEqual(['Я']);
  });

  it('scored by AI → the AI rows replace the offline ones', () => {
    const r = response('sp46', {
      gradingStatus: 'scored',
      grading: {
        v: 1,
        ai: {
          criteria: [
            { id: 'content', score: 27, max: 29, comment: 'ok' },
            { id: 'accuracy', score: 18, max: 21 },
            { id: 'fullness', score: 36, max: 36 },
            { id: 'norms', score: 6, max: 7 },
            { id: 'range', score: 5, max: 7 },
          ],
          tips: [],
        },
      },
    });
    const m = mergedSpeakingCriteria('dialogue', r);
    expect(m.map((c) => [c.id, c.score, c.source, c.pending])).toEqual([
      ['content', 27, 'ai', false],
      ['accuracy', 18, 'ai', false],
      ['fullness', 36, 'ai', false],
      ['norms', 6, 'ai', false],
      ['range', 5, 'ai', false],
    ]);
    expect(mergedSpeakingCriteria('monologue', null).map((c) => c.id)).toEqual([
      'content',
      'structure',
      'competence',
    ]);
    expect(mergedSpeakingCriteria('photo', null).map((c) => c.id)).toEqual([
      'content',
      'structure',
      'competence',
    ]);
  });

  it('examScenarioRung finds the «Іспит» family by id or pack slug', () => {
    const rung = { id: 'exam-a1', packId: 'a1-scn-exam-001' } as never;
    expect(examScenarioRung([{ familyId: 'exam', rungs: [rung] } as never])).toEqual({
      packId: 'a1-scn-exam-001',
      scenarioId: 'exam-a1',
    });
    expect(
      examScenarioRung([
        { familyId: 'podcast', rungs: [{ id: 'p', packId: 'a1-scn-podcast-001' }] } as never,
      ]),
    ).toBeNull();
    expect(examScenarioRung(undefined)).toBeNull();
  });
});

describe('speaking practice + tickets', () => {
  const fx = summaries.find((x) => x.examId === 'a1-mock-fx')!;
  it('practice lists dialogue items (drills first, then finished mocks); the href carries the item', () => {
    const entries = speakingPracticeEntries(summaries);
    expect(entries.length).toBeGreaterThan(0);
    expect(
      entries.every(
        (e) => e.item.kind === 'speaking-reply' || e.item.kind === 'speaking-situation',
      ),
    ).toBe(true);
    expect(speakingPracticeHref(entries[0]!)).toEqual({
      pathname: '/torfl/speak',
      params: { packId: PACK.id, examId: entries[0]!.examId, itemId: entries[0]!.item.id },
    });
    expect(ticketHref()).toEqual({ pathname: '/torfl/tickets' });
  });

  it('tickets = monologue items with their answered count; the draw is weighted to the least practised', () => {
    const tickets = monologueTickets([fx], new Map());
    expect(tickets.length).toBeGreaterThan(0);
    const first = tickets[0]!;
    const counts = new Map([[`${PACK.id}:${first.examId}:${first.item.id}`, 3]]);
    const weighted = monologueTickets([fx], counts);
    expect(weighted.find((t) => t.item.id === first.item.id)!.answered).toBe(3);
    expect(drawTicket(weighted, () => 0.999)).not.toBeNull();
    expect(drawTicket([], () => 0)).toBeNull();
    expect(monologueTickets([{ ...fx, exam: null }])).toEqual([]);
  });
});
