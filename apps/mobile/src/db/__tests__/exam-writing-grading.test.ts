import { ExamSchema, type Exam, type Pack } from '@sutinki/schema';
import examPackJson from '@sutinki/schema/fixtures/packs/a1-ukrexam-fixture/pack.json';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiError } from '@/features/ai/errors';
import type { ResolvedRun } from '@/features/ai/run-profile';
import { initialRunState, reduce, type ExamRunState } from '@/features/torfl/engine/exam-machine';
import { finalizeAttempt } from '@/features/torfl/engine/finalize';
import { startMockAttempt } from '@/features/torfl/engine/start';
import {
  processGradingQueue,
  recomputeResults,
  type GradingJobInput,
  type GradingQueueDeps,
} from '@/features/torfl/grading/queue-core';
import {
  criteriaPercent,
  gradeWritingOffline,
  offlineItemScore,
  selfCheckCriteria,
} from '@/features/torfl/grading/writing';
import { writingShare } from '@/features/torfl/writing/writing-model';
import { parseExamGrade } from '@/features/ai/schemas';
import { writingGrader } from '@/features/torfl/grading/writing-grader';
import type { ExamAnswer, ExamGrading } from '@/features/torfl/model';

import { importPack } from '../importer';
import { createRepositories } from '../repositories';
import type { SutinkiDB } from '../types';
import { createTestDb } from './helpers';

vi.mock('@/services/analytics', () => ({ track: vi.fn() }));

/**
 * T72 integration: the five-subtest verdict computed end to end on the
 * real schema with WRITING graded through this ticket's path (offline
 * provisional at finish → the AI queue rewrites the row → results/verdict
 * recomputed) and SPEAKING injected as a scored response (T73 proves it on
 * device). Plus the failure path (ai-failed keeps the provisional points)
 * and the self-check path.
 */

const PACK = examPackJson as unknown as Pack;
const EXAM = ExamSchema.parse(PACK.exams!.find((e) => e.id === 'a1-mock-fx')) as Exam;
const PACK_ID = PACK.id;
const T0 = 1_790_000_000_000;
const WRITING = EXAM.subtests.find((s) => s.kind === 'writing')!;
const ITEM = WRITING.parts[0]!.items[0]!; // wr44, the short message (10 of 33 points)
const TEXT_ITEM = WRITING.parts[1]!.items[0]!; // wr45, the detailed text (23 of 33)
const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../features/ai/__tests__/__fixtures__',
);
const fixture = (name: string) =>
  JSON.parse(readFileSync(path.join(FIXTURES, `${name}.json`), 'utf8')) as {
    input: { letter: string };
    choices: { message: { content: string } }[];
  };
const GOOD = fixture('exam-uk-writing-a1-message-strong-synthetic');
const GOOD_PCT = criteriaPercent(parseExamGrade(GOOD.choices[0]!.message.content)!.criteria);
/** A letter that earns 100 % offline on both tasks. */
const FULL_MESSAGE =
  'Привіт, Оксано!\nМене звати Мітч. Я живу в Колорадо і працюю вдома.\nДо зустрічі!';
const RUN: ResolvedRun = {
  profile: { provider: 'anthropic', quality: 'normal', effort: 'high' },
  model: 'anthropic/claude-opus-5.5',
  extras: {},
};

let db: SutinkiDB;
let repos: ReturnType<typeof createRepositories>;

beforeEach(async () => {
  db = createTestDb();
  repos = createRepositories(db);
  await importPack(db, examPackJson);
});

/** Sit a full mock: every objective item right, the letter written, speaking skipped; writing scored like the executor does. */
async function sitFullMock(letter: string, online: boolean) {
  const attempt = await startMockAttempt(
    repos.exams,
    EXAM,
    PACK_ID,
    { scope: 'full' },
    { now: T0 },
  );
  const ctx = { exam: EXAM, breakBetween: false };
  let state: ExamRunState = initialRunState(
    EXAM,
    EXAM.subtests.map((s) => s.id),
  );
  const answers: Record<string, ExamAnswer> = {};
  const step = (e: Parameters<typeof reduce>[2]) => {
    state = reduce(ctx, state, e).state;
  };
  step({ type: 'START', now: T0 });
  for (const subtest of EXAM.subtests) {
    if (subtest.kind === 'speaking') {
      step({ type: 'SUBMIT_SUBTEST', now: T0 }); // placeholder → skipped
      continue;
    }
    step({ type: 'BEGIN', now: T0 });
    for (const item of subtest.parts.flatMap((p) => p.items)) {
      const answer: ExamAnswer | null =
        item.kind === 'choice'
          ? { kind: 'choice', index: item.answer }
          : item.kind === 'writing'
            ? { kind: 'writing', text: letter }
            : null;
      if (!answer) continue;
      answers[item.id] = answer;
      step({ type: 'ANSWER', itemId: item.id, answer, now: T0 + 1000 });
      if (item.kind === 'writing') {
        // the executor's SCORE_SUBTEST writing branch
        const grade = gradeWritingOffline(item, letter);
        const share = writingShare(subtest, item);
        await repos.exams.recordResponse({
          attemptId: attempt.id,
          subtestId: subtest.id,
          itemId: item.id,
          answer,
          points: offlineItemScore(grade, share).points,
          maxPoints: share,
          gradingStatus: online ? 'pending-ai' : 'provisional',
          grading: { v: 1, offline: { criteria: grade.criteria, details: { ...grade.details } } },
        });
      } else {
        await repos.exams.recordResponse({
          attemptId: attempt.id,
          subtestId: subtest.id,
          itemId: item.id,
          answer,
          points: subtest.pointsPerItem ?? 1,
          maxPoints: subtest.pointsPerItem ?? 1,
          gradingStatus: 'scored',
        });
      }
    }
    step({ type: 'SUBMIT_SUBTEST', now: T0 + 2000 });
  }
  expect(state.phase).toBe('done');
  const out = await finalizeAttempt(
    { exams: repos.exams, rewards: async () => ({ xp: 120 }), now: T0 + 5 },
    {
      attemptId: attempt.id,
      packId: PACK_ID,
      examId: EXAM.id,
      scope: 'full',
      exam: EXAM,
      state,
      answers,
    },
  );
  return { attempt, out };
}

function queueDeps(over: Partial<GradingQueueDeps> = {}): GradingQueueDeps {
  return {
    graders: [writingGrader],
    listPending: async () =>
      (await repos.exams.pendingGrading()).map<GradingJobInput>((r) => ({
        responseId: r.id,
        attemptId: r.attemptId,
        packId: r.packId,
        examId: r.examId,
        subtestId: r.subtestId,
        itemId: r.itemId,
        answer: r.answer,
        grading: r.grading,
        points: r.points,
        maxPoints: r.maxPoints,
      })),
    loadExam: (p, e) => repos.exams.getExam(p, e),
    storyText: async () => null,
    resolveRun: async () => RUN,
    chat: async () => ({ content: GOOD.choices[0]!.message.content, model: RUN.model }),
    timeoutMs: () => 1000,
    writeGraded: async (job, write) => {
      await repos.exams.setGrading(job.responseId, {
        points: write.points,
        gradingStatus: 'scored',
        grading: write.grading,
      });
    },
    writeFailed: async (job, error) => {
      const prev: ExamGrading = job.grading ?? { v: 1 };
      await repos.exams.setGrading(job.responseId, {
        points: job.points,
        gradingStatus: 'ai-failed',
        grading: { ...prev, error: { code: error.code, attempts: error.attempts } },
      });
    },
    recomputeAttempt: async (attemptId) => {
      const d = (await repos.exams.getAttempt(attemptId))!;
      const r = recomputeResults(EXAM, d.results, d.responses, d.scope);
      await repos.exams.updateResults(attemptId, r.results, r.verdict);
    },
    isOnline: async () => true,
    sleep: async () => {},
    now: () => T0 + 60_000,
    retryDelaysMs: [0, 0],
    ...over,
  };
}

async function injectSpeaking(attemptId: string, points: number) {
  // T73's job: a scored speaking response. Inject it directly on the finished attempt (the repo
  // refuses recordResponse on a non-active attempt), as the executor would have done before finish.
  const speaking = EXAM.subtests.find((s) => s.kind === 'speaking')!;
  const sp = speaking.parts.flatMap((p) => p.items)[0]!;
  await db.run(
    (await import('drizzle-orm'))
      .sql`INSERT INTO exam_responses (id, attempt_id, subtest_id, item_id, answer_json, points, max_points, grading_status, grading_json, created_at, updated_at)
     VALUES (${`sp-inject-${attemptId}`}, ${attemptId}, ${speaking.id}, ${sp.id}, ${JSON.stringify({ kind: 'speaking-reply', transcript: 'я з колорадо', recordingPath: null, durationMs: 1200 })}, ${points}, ${speaking.maxPoints}, 'scored', ${JSON.stringify({ v: 1, ai: { criteria: [], tips: [] } })}, ${T0}, ${T0})`,
  );
  const d = (await repos.exams.getAttempt(attemptId))!;
  const r = recomputeResults(EXAM, d.results, d.responses, d.scope);
  await repos.exams.updateResults(attemptId, r.results, r.verdict);
  return r;
}

describe('UT17b end to end on the real schema (four sections, Ukrainian rubrics)', () => {
  it('finish → writing provisional (offline), verdict null (speaking missing); queue → AI pct, gradedBy ai; speaking injected → the FOUR-section verdict', async () => {
    const { attempt, out } = await sitFullMock(FULL_MESSAGE, true);
    expect(out.results.wr).toMatchObject({ maxPoints: 33, provisional: true, gradedBy: 'offline' });
    expect(out.verdict).toBeNull();
    expect(out.finish.verdict?.missing).toEqual(['speaking']);
    const stored = (await repos.exams.getAttempt(attempt.id))!;
    expect(stored.status).toBe('finished');
    expect(stored.responses.find((r) => r.itemId === ITEM.id)).toMatchObject({
      gradingStatus: 'pending-ai',
      maxPoints: 10,
    });
    expect(stored.responses.find((r) => r.itemId === TEXT_ITEM.id)).toMatchObject({
      maxPoints: 23,
    });

    // the AI queue grades both writing rows
    expect(await processGradingQueue(queueDeps())).toBe(2);
    const graded = (await repos.exams.getAttempt(attempt.id))!;
    const wr = graded.responses.find((r) => r.itemId === ITEM.id)!;
    expect(wr.gradingStatus).toBe('scored');
    expect(wr.points).toBeCloseTo((GOOD_PCT / 100) * 10, 1);
    expect(wr.grading!.ai!.criteria.map((c) => c.id)).toEqual([
      'content',
      'form',
      'norms',
      'volume',
    ]);
    expect(wr.grading!.ai!.model).toBe('anthropic/claude-opus-5.5');
    expect(wr.grading!.offline).toBeDefined();
    expect(graded.results!.wr).toMatchObject({ maxPoints: 33, provisional: false, gradedBy: 'ai' });
    expect(graded.results!.wr!.pct).toBeCloseTo(GOOD_PCT, 0);
    expect(graded.verdict).toBeNull(); // speaking still missing
    expect(await repos.exams.pendingGrading()).toEqual([]);

    // speaking lands (30 of 38) → the first four-section verdict: (100 + 100 + ~GOOD + 78.9) / 4 ≥ 70
    const r = await injectSpeaking(attempt.id, 30);
    expect(r.results.sp).toMatchObject({ pct: 78.9, gradedBy: 'ai', provisional: false });
    expect(r.verdict).toBe('pass');
    expect(r.provisional).toBe(false);
    const final = (await repos.exams.getAttempt(attempt.id))!;
    expect(final.verdict).toBe('pass');
    expect(Object.keys(final.results!).sort()).toEqual(['ls', 'rd', 'sp', 'wr']);
  });

  it('no per-section floor: a weak writing is carried by the total (70 %); a weak total fails', async () => {
    const { attempt } = await sitFullMock('Бувай.', true);
    // Message 10 pts → 40 %, text 23 pts → 40 %: writing 40 % of 33.
    const forty = JSON.stringify({
      criteria: [
        { id: 'content', score: 16, max: 40 },
        { id: 'form', score: 4, max: 10 },
        { id: 'norms', score: 16, max: 40 },
        { id: 'volume', score: 4, max: 10 },
      ],
      corrected: 'Бувай.',
      changes: [],
      tips: ['Write more.'],
    });
    await processGradingQueue(queueDeps({ chat: async () => ({ content: forty, model: 'm' }) }));
    let r = await injectSpeaking(attempt.id, 38);
    expect(r.results.wr!.pct).toBe(40);
    // (100 + 100 + 40 + 100) / 4 = 85
    expect(r.verdict).toBe('pass');

    const second = await sitFullMock('Бувай.', true);
    await processGradingQueue(queueDeps({ chat: async () => ({ content: forty, model: 'm' }) }));
    r = await injectSpeaking(second.attempt.id, 4); // (100 + 100 + 40 + 10.5) / 4 = 62.6
    expect(r.verdict).toBe('fail');
  });

  it('offline sitting (no key): writing stays provisional; later queueing it grades it', async () => {
    const { attempt } = await sitFullMock(FULL_MESSAGE, false);
    const d = (await repos.exams.getAttempt(attempt.id))!;
    const wr = d.responses.find((r) => r.itemId === ITEM.id)!;
    expect(wr.gradingStatus).toBe('provisional');
    expect(await processGradingQueue(queueDeps())).toBe(0);
    // «Повторить оценку» / going online with a key: the row goes pending-ai
    await repos.exams.setGrading(wr.id, {
      points: wr.points,
      gradingStatus: 'pending-ai',
      grading: wr.grading,
    });
    expect(await processGradingQueue(queueDeps())).toBe(1);
    // the second writing row (wr45) was never queued offline → still provisional here
    expect((await repos.exams.getAttempt(attempt.id))!.results!.wr!.gradedBy).toBe('offline');
  });

  it('three transport failures → ai-failed with the code, provisional points + offline grading kept; results stay provisional', async () => {
    const { attempt } = await sitFullMock(FULL_MESSAGE, true);
    await processGradingQueue(
      queueDeps({
        chat: async () => {
          throw new AiError('http-server', 'boom', 500);
        },
      }),
    );
    const d = (await repos.exams.getAttempt(attempt.id))!;
    const wr = d.responses.find((r) => r.itemId === ITEM.id)!;
    expect(wr.gradingStatus).toBe('ai-failed');
    expect(wr.points).toBe(10);
    expect(wr.grading!.error).toEqual({ code: 'http-server', attempts: 3 });
    expect(wr.grading!.offline).toBeDefined();
    expect(d.results!.wr).toMatchObject({ provisional: true, gradedBy: 'offline' });
    // retry: back to pending-ai (error cleared) → scored
    const { error: _e, ...kept } = wr.grading!;
    void _e;
    await repos.exams.setGrading(wr.id, {
      points: wr.points,
      gradingStatus: 'pending-ai',
      grading: kept,
    });
    expect(await processGradingQueue(queueDeps())).toBe(1);
    // the other writing row (wr45) also failed → grade it too (a second pass), then the section is final
    for (const r of d.responses.filter((x) => x.gradingStatus === 'ai-failed' && x.id !== wr.id)) {
      const { error: _e2, ...k } = r.grading!;
      void _e2;
      await repos.exams.setGrading(r.id, {
        points: r.points,
        gradingStatus: 'pending-ai',
        grading: k,
      });
    }
    expect(await processGradingQueue(queueDeps())).toBe(1);
    expect((await repos.exams.getAttempt(attempt.id))!.results!.wr!.provisional).toBe(false);
  });

  it('Самоперевірка: the self-check criteria → self-graded, gradedBy self, final', async () => {
    const { attempt } = await sitFullMock(FULL_MESSAGE, false);
    const d = (await repos.exams.getAttempt(attempt.id))!;
    // both writing rows self-graded: message norms 1/1 (40), text answers (fit 1, coherence 1, norms 1/1, richness 1)
    for (const r of d.responses.filter((x) => x.subtestId === WRITING.id)) {
      const kind = r.itemId === ITEM.id ? 'message' : 'text';
      const answers =
        kind === 'message'
          ? { 'norms-forms': 1, 'norms-verbs': 1 }
          : { fit: 1, coherence: 1, 'norms-forms': 1, 'norms-verbs': 1, richness: 1 };
      const criteria = selfCheckCriteria(r.grading!.offline!.criteria, answers as never, kind);
      const pct = criteriaPercent(criteria);
      expect(criteria.reduce((n, c) => n + c.max, 0)).toBe(100);
      await repos.exams.setGrading(r.id, {
        points: Math.round((pct / 100) * r.maxPoints * 10) / 10,
        gradingStatus: 'self-graded',
        grading: { ...r.grading!, self: { criteria } },
      });
    }
    const after = (await repos.exams.getAttempt(attempt.id))!;
    const r = recomputeResults(EXAM, after.results, after.responses, after.scope);
    await repos.exams.updateResults(attempt.id, r.results, r.verdict);
    // FULL_MESSAGE as the text answer is short (offline content/volume low) but self-check adds the AI-only parts
    expect(r.results.wr).toMatchObject({ maxPoints: 33, provisional: false, gradedBy: 'self' });
    // the queue leaves a self-graded row alone
    expect(await processGradingQueue(queueDeps())).toBe(0);
  });
});
