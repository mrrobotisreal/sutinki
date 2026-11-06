import { ExamSchema, type Exam, type Pack } from '@sutinki/schema';
import examPackJson from '@sutinki/schema/fixtures/packs/a1-ukrexam-fixture/pack.json';
import { describe, expect, it } from 'vitest';

import {
  writingPracticeEntries,
  writingPracticeGroups,
  writingPracticeHref,
} from '../writing/writing-practice-model';
import { mergedCriteria } from '../writing/review-model';

const PACK = examPackJson as unknown as Pack;
const summaries = PACK.exams!.map((e) => ({
  packId: PACK.id,
  examId: e.id,
  mode: e.mode,
  titleUk: e.title.uk,
  titleEn: e.title.en,
  exam: ExamSchema.parse(e) as Exam,
}));

describe('writing practice catalog', () => {
  it('lists every writing item, drills before mocks', () => {
    const entries = writingPracticeEntries(summaries);
    const ids = entries.map((e) => [e.examId, e.item.id, e.mode]);
    expect(ids).toContainEqual(['wr-message', 'wr01', 'drill']);
    expect(ids).toContainEqual(['a1-mock-fx', 'wr44', 'mock']);
    expect(ids).toContainEqual(['a1-mock-fx', 'wr45', 'mock']);
    const firstMock = entries.findIndex((e) => e.mode === 'mock');
    expect(entries.slice(0, firstMock).every((e) => e.mode === 'drill')).toBe(true);
    const mock = entries.find((e) => e.item.id === 'wr44')!;
    expect(writingPracticeHref(mock)).toEqual({
      pathname: '/torfl/writing',
      params: { packId: PACK.id, examId: 'a1-mock-fx', itemId: 'wr44' },
    });
  });
  it('an unreadable exam is skipped', () => {
    expect(writingPracticeEntries([{ ...summaries[0]!, exam: null }])).toEqual([]);
  });
});

describe('mergedCriteria (per rubric kind)', () => {
  const offline = [
    { id: 'content', score: 20, max: 40 },
    { id: 'form', score: 5, max: 10 },
    { id: 'volume', score: 4, max: 10 },
  ];
  it('provisional message: three offline rows + the AI-only «norms» pending', () => {
    const rows = mergedCriteria(
      { gradingStatus: 'provisional', grading: { v: 1, offline: { criteria: offline } } },
      'message',
    );
    expect(rows.map((r) => [r.id, r.source, r.pending])).toEqual([
      ['content', 'offline', false],
      ['form', 'offline', false],
      ['norms', 'offline', true],
      ['volume', 'offline', false],
    ]);
  });
  it('text kind lists the seven text rows', () => {
    const rows = mergedCriteria({ gradingStatus: 'pending-ai', grading: { v: 1 } }, 'text');
    expect(rows.map((r) => r.id)).toEqual([
      'content',
      'form',
      'fit',
      'coherence',
      'norms',
      'richness',
      'volume',
    ]);
    expect(rows.every((r) => r.pending)).toBe(true);
  });
  it('scored: the AI rows win; self-graded: the self rows', () => {
    const ai = [
      { id: 'content', score: 36, max: 40, comment: 'ok' },
      { id: 'form', score: 10, max: 10 },
      { id: 'norms', score: 35, max: 40 },
      { id: 'volume', score: 10, max: 10 },
    ];
    const rows = mergedCriteria(
      {
        gradingStatus: 'scored',
        grading: { v: 1, offline: { criteria: offline }, ai: { criteria: ai, tips: [] } },
      },
      'message',
    );
    expect(rows.every((r) => r.source === 'ai' && !r.pending)).toBe(true);
    expect(rows[0]!.comment).toBe('ok');
    const self = mergedCriteria(
      {
        gradingStatus: 'self-graded',
        grading: { v: 1, offline: { criteria: offline }, self: { criteria: ai } },
      },
      'message',
    );
    expect(self.every((r) => r.source === 'self')).toBe(true);
  });
});

describe('writingPracticeGroups', () => {
  it('splits the short message from the detailed text; headers appear when both exist', () => {
    const groups = writingPracticeGroups(writingPracticeEntries(summaries));
    expect(groups.map((g) => [g.key, g.titleUk])).toEqual([
      ['letter', 'Розгорнутий текст'],
      ['note', 'Коротке повідомлення'],
    ]);
    expect(groups[1]!.entries.every((e) => e.item.topic === 'wr-message')).toBe(true);
  });
  it('only messages → a single header-less group', () => {
    const only = writingPracticeEntries(summaries).filter((e) => e.item.topic === 'wr-text');
    expect(writingPracticeGroups(only).map((g) => [g.key, g.titleUk])).toEqual([['letter', null]]);
  });
});
