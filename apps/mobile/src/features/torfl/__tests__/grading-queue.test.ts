import { ExamSchema, type Exam, type Pack } from '@sutinki/schema';
import examPackJson from '@sutinki/schema/fixtures/packs/a1-ukrexam-fixture/pack.json';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

import { AiError } from '@/features/ai/errors';
import { parseExamGrade } from '@/features/ai/schemas';
import type { ResolvedRun } from '@/features/ai/run-profile';

import {
  GRADING_RETRY_DELAYS_MS,
  processGradingQueue,
  recomputeResults,
  type GradedWrite,
  type GradingJobInput,
  type GradingQueueDeps,
} from '../grading/queue-core';
import { criteriaPercent, gradeWritingOffline, offlineItemScore } from '../grading/writing';
import { writingGrader } from '../grading/writing-grader';
import type { ExamResults } from '../model';

vi.mock('@/services/analytics', () => ({ track: vi.fn() }));

const PACK = examPackJson as unknown as Pack;
const EXAM: Exam = ExamSchema.parse(PACK.exams!.find((e) => e.id === 'a1-mock-fx'));
const WRITING = EXAM.subtests.find((s) => s.kind === 'writing')!;
const ITEM = WRITING.parts[0]!.items[0] as Extract<
  Exam['subtests'][number]['parts'][number]['items'][number],
  { kind: 'writing' }
>;

const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../ai/__tests__/__fixtures__',
);
const fixtureContent = (name: string) =>
  (
    JSON.parse(readFileSync(path.join(FIXTURES, `${name}.json`), 'utf8')) as {
      choices: { message: { content: string } }[];
      input: { letter: string };
    }
  ).choices[0]!.message.content;
/** `_synthetic` fixtures (UT17b): hand-written until Mitch captures live grades. */
const STRONG = 'exam-uk-writing-a1-message-strong-synthetic';
const WEAK = 'exam-uk-writing-a1-message-weak-synthetic';
const GOOD = JSON.parse(readFileSync(path.join(FIXTURES, `${STRONG}.json`), 'utf8')) as {
  input: { letter: string };
};
const pctOf = (name: string) => criteriaPercent(parseExamGrade(fixtureContent(name))!.criteria);

const RUN: ResolvedRun = {
  profile: { provider: 'anthropic', quality: 'normal', effort: 'high' },
  model: 'anthropic/claude-opus-5.5',
  extras: {},
};

function job(letter: string, over: Partial<GradingJobInput> = {}): GradingJobInput {
  const offline = gradeWritingOffline(ITEM, letter);
  return {
    responseId: 'r1',
    attemptId: 'a1',
    packId: PACK.id,
    examId: EXAM.id,
    subtestId: WRITING.id,
    itemId: ITEM.id,
    answer: { kind: 'writing', text: letter },
    grading: { v: 1, offline: { criteria: offline.criteria, details: { ...offline.details } } },
    points: offlineItemScore(offline, 10).points,
    maxPoints: 10,
    ...over,
  };
}

function makeDeps(over: Partial<GradingQueueDeps> = {}) {
  const graded: { job: GradingJobInput; write: GradedWrite }[] = [];
  const failed: { job: GradingJobInput; error: { code: string; attempts: number } }[] = [];
  const recomputed: string[] = [];
  const sleeps: number[] = [];
  const chat = vi.fn(async () => ({
    content: fixtureContent(STRONG),
    model: 'anthropic/claude-opus-5.5',
    usage: { costUsd: 0.03 },
  }));
  const deps: GradingQueueDeps = {
    graders: [writingGrader],
    listPending: async () => [job(GOOD.input.letter)],
    loadExam: async () => EXAM,
    storyText: async () => null,
    resolveRun: async () => RUN,
    chat,
    timeoutMs: () => 1000,
    writeGraded: async (j, w) => {
      graded.push({ job: j, write: w });
    },
    writeFailed: async (j, e) => {
      failed.push({ job: j, error: e });
    },
    recomputeAttempt: async (id) => {
      recomputed.push(id);
    },
    isOnline: async () => true,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    now: () => 1000,
    retryDelaysMs: [1, 1],
    ...over,
  };
  return { deps, graded, failed, recomputed, sleeps, chat };
}

describe('processGradingQueue (writing registered)', () => {
  it('pending → scored: the AI pct, points over maxPoints, grading.ai with receipt, offline kept; attempt recomputed', async () => {
    const { deps, graded, recomputed, chat } = makeDeps();
    expect(await processGradingQueue(deps)).toBe(1);
    expect(chat).toHaveBeenCalledTimes(1);
    const [feature, req, run] = chat.mock.calls[0]! as unknown as [
      string,
      { temperature: number; timeoutMs: number; messages: { role: string }[] },
      ResolvedRun,
    ];
    expect(feature).toBe('exam-writing');
    expect(req.temperature).toBe(0.2);
    expect(req.timeoutMs).toBe(1000);
    expect(req.messages[0]!.role).toBe('system');
    expect(run).toBe(RUN);
    expect(graded).toHaveLength(1);
    const w = graded[0]!.write;
    expect(w.pct).toBe(pctOf(STRONG));
    expect(w.points).toBeCloseTo((pctOf(STRONG) / 100) * 10, 1);
    expect(w.grading.offline).toBeDefined();
    expect(w.grading.ai).toMatchObject({
      provider: 'anthropic',
      model: 'anthropic/claude-opus-5.5',
      quality: 'normal',
      effort: 'high',
      costUsd: 0.03,
    });
    expect(w.grading.ai!.criteria.map((c) => c.id)).toEqual(['content', 'form', 'norms', 'volume']);
    expect(recomputed).toEqual(['a1']);
  });

  it('offline: nothing is sent, nothing written', async () => {
    const { deps, graded, chat } = makeDeps({ isOnline: async () => false });
    expect(await processGradingQueue(deps)).toBe(0);
    expect(chat).not.toHaveBeenCalled();
    expect(graded).toEqual([]);
  });

  it('retriable failure → retry 2× with the delays → ai-failed with the code + attempts; points kept', async () => {
    const { deps, failed, sleeps, graded } = makeDeps({
      chat: vi.fn(async () => {
        throw new AiError('http-server', 'boom', 500);
      }),
    });
    expect(await processGradingQueue(deps)).toBe(0);
    expect(sleeps).toEqual([1, 1]);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.error).toEqual({ code: 'http-server', attempts: 3 });
    expect(failed[0]!.job.points).toBeGreaterThan(0);
    expect(graded).toEqual([]);
    expect(GRADING_RETRY_DELAYS_MS).toEqual([2_000, 8_000]);
  });

  it('transient failure then success → scored on the second attempt', async () => {
    let calls = 0;
    const { deps, graded, failed } = makeDeps({
      chat: vi.fn(async () => {
        calls++;
        if (calls === 1) throw new AiError('timeout', 'slow');
        return {
          content: fixtureContent(WEAK),
          model: 'openai/gpt-6-sol-pro',
        };
      }),
    });
    expect(await processGradingQueue(deps)).toBe(1);
    expect(failed).toEqual([]);
    expect(graded[0]!.write.pct).toBe(pctOf(WEAK));
  });

  it('an invalid completion counts as retriable (the journal rule) → the two retries, then ai-failed invalid-response', async () => {
    const chat = vi.fn(async () => ({ content: 'sorry, no json', model: 'm' }));
    const { deps, failed } = makeDeps({ chat });
    await processGradingQueue(deps);
    expect(chat).toHaveBeenCalledTimes(3);
    expect(failed[0]!.error).toEqual({ code: 'invalid-response', attempts: 3 });
  });

  it('a key problem stops the pass after the first job', async () => {
    const chat = vi.fn(async () => {
      throw new AiError('no-key', 'no key');
    });
    const { deps, failed } = makeDeps({
      chat,
      listPending: async () => [job('а'), job('б', { responseId: 'r2' })],
    });
    await processGradingQueue(deps);
    expect(chat).toHaveBeenCalledTimes(1);
    expect(failed.map((f) => f.job.responseId)).toEqual(['r1']);
  });

  it('a kind with no registered grader stays pending (the T73 seam); a removed exam fails the job', async () => {
    const { deps, failed, graded, chat } = makeDeps({
      graders: [],
      listPending: async () => [job('x')],
    });
    await processGradingQueue(deps);
    expect(chat).not.toHaveBeenCalled();
    expect(failed).toEqual([]);
    expect(graded).toEqual([]);

    const gone = makeDeps({ loadExam: async () => null });
    await processGradingQueue(gone.deps);
    expect(gone.failed[0]!.error.code).toBe('invalid-response');
  });

  it('an empty / foreign answer cannot be graded → ai-failed invalid-response without a call', async () => {
    const { deps, failed, chat } = makeDeps({
      listPending: async () => [job('', { answer: { kind: 'writing', text: '  ' } })],
    });
    await processGradingQueue(deps);
    expect(chat).not.toHaveBeenCalled();
    expect(failed[0]!.error.code).toBe('invalid-response');
  });

  it('the model letter (when the item has one) is resolved through storyText and reaches the prompt', async () => {
    const withModel: Exam = {
      ...EXAM,
      subtests: EXAM.subtests.map((s) =>
        s.kind !== 'writing'
          ? s
          : {
              ...s,
              parts: s.parts.map((p) => ({
                ...p,
                items: p.items.map((i) =>
                  i.kind === 'writing' ? { ...i, model: { storyId: 'rd-01' } } : i,
                ),
              })),
            },
      ),
    };
    const storyText = vi.fn(async () => 'Анна живе в Києві.');
    const { deps, chat } = makeDeps({ loadExam: async () => withModel, storyText });
    await processGradingQueue(deps);
    expect(storyText).toHaveBeenCalledWith(PACK.id, 'rd-01', undefined);
    const req = (chat.mock.calls[0] as unknown as [string, { messages: { content: string }[] }])[1];
    expect(req.messages[1]!.content).toContain('Анна живе в Києві.');
    expect(req.messages[0]!.content).toContain('Ukrainian state-language exam');
    expect(req.messages[1]!.content).toContain('A MODEL TEXT');
  });
});

describe('recomputeResults (four sections: ls · rd · wr · sp; pass ≥ 70 %)', () => {
  const objective: ExamResults = {
    ls: { points: 8, maxPoints: 8, pct: 100, provisional: false, gradedBy: 'offline' },
    rd: { points: 16, maxPoints: 16, pct: 100, provisional: false, gradedBy: 'offline' },
  };
  const offline = {
    subtestId: 'wr',
    points: 19,
    gradingStatus: 'provisional',
    grading: { v: 1 as const, offline: { criteria: [] } },
  };

  it('a provisional writing response → writing row provisional/offline over 33; no verdict while speaking is missing', () => {
    const r = recomputeResults(EXAM, objective, [offline], 'full');
    expect(r.results.wr).toEqual({
      points: 19,
      maxPoints: 33,
      pct: 57.6,
      provisional: true,
      gradedBy: 'offline',
    });
    expect(r.verdict).toBeNull();
    expect(r.results.ls).toEqual(objective.ls);
  });

  it('AI-graded writing → gradedBy ai, not provisional; with speaking present the verdict appears', () => {
    const ai = {
      ...offline,
      points: 31,
      gradingStatus: 'scored',
      grading: { v: 1 as const, ai: { criteria: [], tips: [] } },
    };
    const speaking = {
      subtestId: 'sp',
      points: 30,
      gradingStatus: 'scored',
      grading: { v: 1 as const, ai: { criteria: [], tips: [] } },
    };
    const r = recomputeResults(EXAM, objective, [ai, speaking], 'full');
    expect(r.results.wr).toMatchObject({ pct: 93.9, provisional: false, gradedBy: 'ai' });
    expect(r.results.sp).toMatchObject({ pct: 78.9, provisional: false, gradedBy: 'ai' });
    expect(r.verdict).toBe('pass');
    expect(r.provisional).toBe(false);
  });

  it('self-graded → gradedBy self, final; the weighted total decides pass / fail at 70 %', () => {
    const self = {
      ...offline,
      points: 33 * 0.4,
      gradingStatus: 'self-graded',
      grading: { v: 1 as const, self: { criteria: [] } },
    };
    const speaking = { ...self, subtestId: 'sp', points: 38 * 0.4 };
    // (100 + 100 + 40 + 40) / 4 = 70 → pass exactly at the threshold
    const r = recomputeResults(EXAM, objective, [self, speaking], 'full');
    expect(r.results.wr).toMatchObject({ pct: 40, provisional: false, gradedBy: 'self' });
    expect(r.verdict).toBe('pass');
    const worse = recomputeResults(
      EXAM,
      objective,
      [{ ...self, points: 33 * 0.3 }, speaking],
      'full',
    );
    expect(worse.verdict).toBe('fail'); // (100 + 100 + 30 + 40) / 4 = 67.5
  });

  it('a provisional speaking beside final writing → verdict present but provisional', () => {
    const ai = {
      ...offline,
      points: 30,
      gradingStatus: 'scored',
      grading: { v: 1 as const, ai: { criteria: [], tips: [] } },
    };
    const spk = { ...offline, subtestId: 'sp', points: 30 };
    const r = recomputeResults(EXAM, objective, [ai, spk], 'full');
    expect(r.verdict).toBe('pass');
    expect(r.provisional).toBe(true);
  });

  it('single-subtest scope: results update, verdict stays null', () => {
    const r = recomputeResults(EXAM, null, [offline], 'subtest');
    expect(r.results.wr!.pct).toBe(57.6);
    expect(r.verdict).toBeNull();
  });
});
