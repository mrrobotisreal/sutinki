import { ExamSchema, type Exam, type Pack, type SpeakingMonologueItem } from '@sutinki/schema';
import examPackJson from '@sutinki/schema/fixtures/packs/a1-ukrexam-fixture/pack.json';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

import type { ResolvedRun } from '@/features/ai/run-profile';

import {
  processGradingQueue,
  type GradedWrite,
  type GradingJobInput,
  type GradingQueueDeps,
} from '../grading/queue-core';
import { registeredGraderKinds } from '../grading/queue';
import { parseExamGrade } from '@/features/ai/schemas';

import {
  gradeSpeakingOffline,
  offlineSpeakingPoints,
  responseShare,
  speakingCriteriaPercent,
} from '../grading/speaking';
import { speakingGrader } from '../grading/speaking-grader';
import { writingGrader } from '../grading/writing-grader';
import type { SpeakingAnswer } from '../model';

vi.mock('@/services/analytics', () => ({ track: vi.fn() }));
vi.mock('@/db', () => ({ repos: {} }));
vi.mock('@/db/hooks', () => ({ invalidateExams: vi.fn() }));
vi.mock('@/features/ai/connectivity', () => ({ isOnline: vi.fn() }));
vi.mock('@/features/ai/run-profile', () => ({
  getModelTable: vi.fn(),
  resolveRun: vi.fn(),
  timeoutFor: vi.fn(),
}));
vi.mock('@/features/ai/runner', () => ({ runChat: vi.fn() }));
vi.mock('@/features/motivation/service', () => ({ recordExamVerdictUnlocks: vi.fn() }));
vi.mock('@/services/error-log', () => ({ logError: vi.fn() }));
vi.mock('../settings', () => ({ getExamGradingPreset: vi.fn() }));

/**
 * T73: the `speaking` grader on T72's kind-agnostic queue — registered
 * beside writing, requests the `exam-speaking` feature, renders the task's
 * prompt from the stored transcript(s) (+ the model answer), folds the
 * parsed grade into `points = pct × the response's share` with the offline
 * block kept, and the captured fixtures drive the fake chat.
 */

const PACK = examPackJson as unknown as Pack;
const EXAM: Exam = ExamSchema.parse(PACK.exams!.find((e) => e.id === 'a1-mock-fx'));
const SPEAKING = EXAM.subtests.find((s) => s.kind === 'speaking')!;
const items = SPEAKING.parts.flatMap((p) => p.items);
const REPLY = items.find((i) => i.id === 'sp46')!;
const MONO = items.find((i) => i.id === 'sp45') as SpeakingMonologueItem;

const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../ai/__tests__/__fixtures__',
);
const fixtureContent = (name: string) =>
  (
    JSON.parse(readFileSync(path.join(FIXTURES, `${name}.json`), 'utf8')) as {
      choices: { message: { content: string } }[];
    }
  ).choices[0]!.message.content;

const pctOf = (name: string) =>
  speakingCriteriaPercent(parseExamGrade(fixtureContent(name))!.criteria);
const REPLY_FX = 'exam-uk-speaking-a1-dialogue-reply-synthetic';
const MONO_FX = 'exam-uk-speaking-a2-monologue-synthetic';

const RUN: ResolvedRun = {
  profile: { provider: 'anthropic', quality: 'normal', effort: 'high' },
  model: 'anthropic/claude-opus-5.5',
  extras: {},
};

function speakingJob(
  item: typeof REPLY | typeof MONO,
  answer: SpeakingAnswer,
  over: Partial<GradingJobInput> = {},
): GradingJobInput {
  const offline = gradeSpeakingOffline(item, answer)!;
  const share = responseShare(SPEAKING, item);
  return {
    responseId: `r-${item.id}`,
    attemptId: 'a1',
    packId: PACK.id,
    examId: EXAM.id,
    subtestId: SPEAKING.id,
    itemId: item.id,
    answer,
    grading: { v: 1, offline: { criteria: offline.criteria, details: { ...offline.details } } },
    points: offlineSpeakingPoints(offline, share),
    maxPoints: share,
    ...over,
  };
}

function makeDeps(over: Partial<GradingQueueDeps> = {}) {
  const graded: { job: GradingJobInput; write: GradedWrite }[] = [];
  const failed: { job: GradingJobInput; error: { code: string; attempts: number } }[] = [];
  const recomputed: string[] = [];
  const chat = vi.fn(async () => ({
    content: fixtureContent(REPLY_FX),
    model: 'anthropic/claude-opus-5.5',
    usage: { costUsd: 0.02 },
  }));
  const deps: GradingQueueDeps = {
    graders: [writingGrader, speakingGrader],
    listPending: async () => [],
    loadExam: async () => EXAM,
    storyText: async (_p, storyId) => (storyId === 'ex-01' ? 'Де ви зараз живете?' : null),
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
    sleep: async () => undefined,
    now: () => 1000,
    retryDelaysMs: [1, 1],
    ...over,
  };
  return { deps, graded, failed, recomputed, chat };
}

describe('the speaking grader on the queue', () => {
  it('is registered in production beside writing', () => {
    expect(registeredGraderKinds()).toEqual(['writing', 'speaking']);
  });

  it('task 1: requests exam-speaking with the prompt text + model answer; folds pct × share', async () => {
    const answer: SpeakingAnswer = {
      kind: 'speaking-reply',
      transcript: 'я зараз живу в колорадо з моя наречена вона українка',
      assistTranscript: 'Я зараз живу в Колорадо з моя наречена, вона українка.',
      recordingPath: 't1-sp46.ogg',
      durationMs: 4200,
    };
    const job = speakingJob(REPLY, answer);
    const { deps, graded, recomputed, chat } = makeDeps({ listPending: async () => [job] });
    expect(await processGradingQueue(deps)).toBe(1);
    const [feature, req] = chat.mock.calls[0]! as unknown as [
      string,
      { temperature: number; messages: { role: string; content: string }[] },
    ];
    expect(feature).toBe('exam-speaking');
    expect(req.temperature).toBe(0.2);
    expect(req.messages[0]!.content).toContain('task 48');
    expect(req.messages[0]!.content).toContain('Ukrainian state-language exam');
    expect(req.messages[1]!.content).toContain('Де ви зараз живете?');
    expect(req.messages[1]!.content).toContain('Мене звати Оксана.');
    expect(req.messages[1]!.content).toContain('з моя наречена вона українка');
    expect(req.messages[1]!.content).toContain('re-decoded by Whisper');
    expect(graded).toHaveLength(1);
    const w = graded[0]!.write;
    expect(w.pct).toBe(pctOf(REPLY_FX));
    expect(job.maxPoints).toBeCloseTo(14 / 3, 3);
    expect(w.points).toBeCloseTo((w.pct / 100) * job.maxPoints, 1);
    expect(w.grading.offline).toBeDefined();
    expect(w.grading.ai!.criteria.map((c) => c.id)).toEqual([
      'content',
      'accuracy',
      'fullness',
      'norms',
      'range',
    ]);
    expect(w.grading.ai).toMatchObject({ provider: 'anthropic', effort: 'high', costUsd: 0.02 });
    expect(recomputed).toEqual(['a1']);
  });

  it('monologue: the prompt carries the points + range; the fixture folds to its pct of the 10-point share', async () => {
    const answer: SpeakingAnswer = {
      kind: 'speaking-monologue',
      transcript: 'мене звати мітч мені тридцять шість років я з америки',
      recordingPath: null,
      durationMs: 120_000,
    };
    const job = speakingJob(MONO, answer);
    const chat = vi.fn(async () => ({
      content: fixtureContent(MONO_FX),
      model: 'synthetic',
    }));
    const { deps, graded } = makeDeps({ listPending: async () => [job], chat });
    await processGradingQueue(deps);
    const req = (chat.mock.calls[0] as unknown as [string, { messages: { content: string }[] }])[1];
    expect(req.messages[0]!.content).toContain('task 47');
    expect(req.messages[1]!.content).toContain('  1. Як вас звати?');
    expect(req.messages[1]!.content).toContain('Required: 20–25 phrases.'.replace('20–25', '8–10'));
    expect(graded[0]!.write.pct).toBe(pctOf(MONO_FX));
    expect(job.maxPoints).toBe(10);
    expect(graded[0]!.write.points).toBeCloseTo((pctOf(MONO_FX) / 100) * 10, 1);
    expect(graded[0]!.write.grading.ai!.criteria.map((c) => c.id)).toEqual([
      'content',
      'structure',
      'competence',
    ]);
  });

  it('an answer with nothing recognized cannot be graded → ai-failed invalid-response without a call', async () => {
    const job = speakingJob(REPLY, {
      kind: 'speaking-reply',
      transcript: '  ',
      recordingPath: null,
      durationMs: 0,
    });
    const { deps, failed, chat } = makeDeps({ listPending: async () => [job] });
    await processGradingQueue(deps);
    expect(chat).not.toHaveBeenCalled();
    expect(failed[0]!.error.code).toBe('invalid-response');
  });

  it('a writing job and a speaking job in one pass each reach their own grader', async () => {
    const WRITING = EXAM.subtests.find((s) => s.kind === 'writing')!;
    const wItem = WRITING.parts[0]!.items[0]!;
    const writingJob: GradingJobInput = {
      responseId: 'w1',
      attemptId: 'a1',
      packId: PACK.id,
      examId: EXAM.id,
      subtestId: WRITING.id,
      itemId: wItem.id,
      answer: { kind: 'writing', text: 'Привіт! Мене звати Мітч. Я живу в Колорадо.' },
      grading: null,
      points: 5,
      maxPoints: 10,
    };
    const sJob = speakingJob(REPLY, {
      kind: 'speaking-reply',
      transcript: 'мене звати оксана',
      recordingPath: null,
      durationMs: 1,
    });
    const chat = vi.fn(async (feature: string) => ({
      content: fixtureContent(
        feature === 'exam-writing' ? 'exam-uk-writing-a1-message-strong-synthetic' : REPLY_FX,
      ),
      model: 'm',
    }));
    const { deps, graded } = makeDeps({
      listPending: async () => [writingJob, sJob],
      chat: chat as unknown as GradingQueueDeps['chat'],
    });
    expect(await processGradingQueue(deps)).toBe(2);
    expect(chat.mock.calls.map((c) => c[0])).toEqual(['exam-writing', 'exam-speaking']);
    expect(graded.map((g) => g.write.pct)).toEqual([
      pctOf('exam-uk-writing-a1-message-strong-synthetic'),
      pctOf(REPLY_FX),
    ]);
  });
});
