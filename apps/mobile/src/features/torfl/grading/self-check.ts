import { repos } from '@/db';
import { invalidateExams } from '@/db/hooks';
import { trackTorfl } from '@/services/analytics';

import type { ExamResponse } from '@/db/repositories/exams';
import type { TorflLevel } from '../level-profile';

import type { ExamGrading } from '../model';
import { recomputeAttemptResults } from './queue';
import {
  criteriaPercent,
  selfCheckCriteria,
  writingKindOf,
  type WritingKind,
  type SelfCheckId,
  type SelfCheckValue,
} from './writing';

/**
 * «Самоперевірка» write path (T72, TORFL §6.2): fold the four answers with
 * the response's offline criteria into a full full set, store it
 * as `grading.self`, mark the row `self-graded` with the new points, then
 * recompute the attempt (gradedBy 'self', final). Returns the pct.
 *
 * `level` / `task` / `topic` are the analytics props (T75, THE LEVEL RULE):
 * the caller passes the exam's level and the item's writing task + topic.
 */
export async function applySelfCheck(
  response: ExamResponse,
  answers: Record<SelfCheckId, SelfCheckValue>,
  level: TorflLevel = 'A1',
  meta: { task: number; topic: string } = { task: 0, topic: 'none' },
): Promise<number> {
  const prev: ExamGrading = response.grading ?? { v: 1 };
  const storedKind = (prev.offline?.details as { kind?: WritingKind } | undefined)?.kind;
  const kind: WritingKind = storedKind ?? writingKindOf({ topic: meta.topic, minWords: undefined });
  const criteria = selfCheckCriteria(prev.offline?.criteria ?? [], answers, kind);
  const pct = criteriaPercent(criteria);
  const { error: _error, ...kept } = prev;
  void _error;
  await repos.exams.setGrading(response.id, {
    points: Math.round((pct / 100) * response.maxPoints * 10) / 10,
    gradingStatus: 'self-graded',
    grading: { ...kept, self: { criteria } },
  });
  const d = prev.offline?.details as
    { sentences?: number; questions?: number; pointsCovered?: number } | undefined;
  trackTorfl('exam_writing_scored', {
    source: 'self',
    pct,
    sentences: d?.sentences ?? -1,
    questions: d?.questions ?? -1,
    pointsCovered: d?.pointsCovered ?? -1,
    task: meta.task,
    topic: meta.topic,
    level,
  });
  await recomputeAttemptResults(response.attemptId);
  void invalidateExams();
  return pct;
}
