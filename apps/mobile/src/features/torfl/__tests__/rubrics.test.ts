import { UKR_STATE_SHAPES } from '@sutinki/schema';
import { describe, expect, it } from 'vitest';

import {
  SPEAKING_RUBRICS,
  SPEAKING_TASK_POINTS,
  WRITING_RUBRICS,
  WRITING_TASK_POINTS,
  aiOnlyIdsOf,
  anyCriterionLabel,
  offlineMaxOf,
  rubricMax,
} from '../grading/rubrics';

const ALL = [...Object.values(WRITING_RUBRICS), ...Object.values(SPEAKING_RUBRICS)];

describe('rubrics (UKR_EXAM_PREP §2 as data)', () => {
  it('every rubric sums to 100 with unique ids', () => {
    for (const r of ALL) {
      expect(rubricMax(r)).toBe(100);
      expect(new Set(r.map((c) => c.id)).size).toBe(r.length);
    }
  });

  it('offline max + AI-only max partition the rubric; every rubric has an AI-only part', () => {
    for (const r of ALL) {
      const aiMax = r.filter((c) => !c.offline).reduce((n, c) => n + c.max, 0);
      expect(offlineMaxOf(r) + aiMax).toBe(100);
      expect(aiOnlyIdsOf(r).length).toBeGreaterThan(0);
      expect(offlineMaxOf(r)).toBeGreaterThan(0);
    }
  });

  it('Commission points: writing 10 + 23 = 33, speaking 14 + 10 + 14 = 38 — equal the shapes at A1, A2, B1', () => {
    const w = WRITING_TASK_POINTS.message + WRITING_TASK_POINTS.text;
    const s =
      SPEAKING_TASK_POINTS.photo + SPEAKING_TASK_POINTS.monologue + SPEAKING_TASK_POINTS.dialogue;
    expect(w).toBe(33);
    expect(s).toBe(38);
    for (const level of ['A1', 'A2', 'B1'] as const) {
      const sections = UKR_STATE_SHAPES[level].sections;
      expect(sections.find((x) => x.kind === 'writing')!.maxPoints).toBe(w);
      expect(sections.find((x) => x.kind === 'speaking')!.maxPoints).toBe(s);
    }
  });

  it('Commission splits rescaled: message 4/1/4/1 of 10, text 5/1/2/6/6/2/1 of 23', () => {
    const pts = (r: (typeof ALL)[number], total: number) =>
      r.map((c) => Math.round((c.max / 100) * total));
    expect(pts(WRITING_RUBRICS.message, 10)).toEqual([4, 1, 4, 1]);
    expect(pts(WRITING_RUBRICS.text, 23)).toEqual([5, 1, 2, 6, 6, 2, 1]);
    expect(pts(SPEAKING_RUBRICS.photo, 14)).toEqual([4, 6, 4]);
    expect(pts(SPEAKING_RUBRICS.monologue, 10)).toEqual([4, 2, 4]);
    expect(pts(SPEAKING_RUBRICS.dialogue, 14)).toEqual([4, 3, 5, 1, 1]);
  });

  it('labels are Ukrainian with an English gloss; the apostrophe label is present; unknown ids echo', () => {
    expect(anyCriterionLabel('coherence')).toEqual({
      uk: "Логічність і зв'язність",
      en: 'Logic & cohesion',
    });
    expect(anyCriterionLabel('norms').uk).toBe('Нормативність');
    expect(anyCriterionLabel('zzz')).toEqual({ uk: 'zzz', en: 'zzz' });
    for (const r of ALL)
      for (const c of r) expect(/[\u0451\u044b\u044d\u044a]/u.test(c.uk)).toBe(false);
  });
});
