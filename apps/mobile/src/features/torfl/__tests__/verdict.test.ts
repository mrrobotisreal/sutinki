import { UKR_STATE_SHAPES, type ExamSubtestKind } from '@sutinki/schema';
import { describe, expect, it } from 'vitest';

import * as readiness from '../readiness';
import { EXAM_LEVELS, type ExamLevel } from '../level-profile';
import {
  marginLabel,
  predictVerdict,
  ruleOf,
  verdict,
  verdictHeadline,
  weightedTotal,
} from '../verdict';

/** Every section of `level` at `n`. */
const all = (level: ExamLevel, n: number): Partial<Record<ExamSubtestKind, number>> =>
  Object.fromEntries(ruleOf(level).sections.map((s) => [s.kind, n]));

const CITIZENSHIP: ExamLevel[] = ['A1', 'A2', 'B1'];

describe('the pass rule is data from the level shape (UKR_EXAM_PREP §2, ADR-0011)', () => {
  it('A1/A2/B1: four sections × 25 %, pass at 70, no per-section floor', () => {
    for (const level of CITIZENSHIP) {
      const r = ruleOf(level);
      expect(r.sections.map((s) => s.kind)).toEqual(['listening', 'reading', 'writing', 'speaking']);
      expect(r.sections.map((s) => s.weightPct)).toEqual([25, 25, 25, 25]);
      expect(r.passPct).toBe(70);
      expect(r.perSectionMinPct).toBeNull();
    }
  });
  it('B2/C1 are the officials band floors (60 / 70) with 40/30/30 weights', () => {
    expect(ruleOf('B2').passPct).toBe(60);
    expect(ruleOf('C1').passPct).toBe(70);
    expect(ruleOf('B2').sections.map((s) => s.weightPct)).toEqual([40, 30, 30]);
  });
  it('matches the shape object itself (no copy)', () => {
    for (const level of EXAM_LEVELS) {
      expect(ruleOf(level).passPct).toBe(UKR_STATE_SHAPES[level].pass.totalPct);
    }
  });
});

describe('boundary tables — every level (pass = weighted total ≥ threshold, unrounded)', () => {
  for (const level of EXAM_LEVELS) {
    const t = ruleOf(level).passPct;
    describe(`${level} (threshold ${t})`, () => {
      it(`exactly ${t} everywhere → pass, margin 0`, () => {
        const v = verdict(all(level, t), {}, level);
        expect(v).toMatchObject({ verdict: 'pass', margin: 0, passPct: t, retake: [], missing: [] });
      });
      it(`${t - 0.1} everywhere → fail (no rounding up: stricter reading)`, () => {
        expect(verdict(all(level, t - 0.1), {}, level).verdict).toBe('fail');
      });
      it(`${t + 0.1} everywhere → pass`, () => {
        expect(verdict(all(level, t + 0.1), {}, level).verdict).toBe('pass');
      });
      it('100 % and 0 % extremes', () => {
        expect(verdict(all(level, 100), {}, level).verdict).toBe('pass');
        expect(verdict(all(level, 0), {}, level)).toMatchObject({ verdict: 'fail', total: 0 });
      });
    });
  }
});

describe('no per-section floor: a zero section can still pass when the total reaches 70', () => {
  it('A1: 100 / 100 / 100 / 0 → total 75 → pass (a floor-less rule)', () => {
    const v = verdict({ listening: 100, reading: 100, writing: 100, speaking: 0 }, {}, 'A1');
    expect(v.verdict).toBe('pass');
    expect(v.total).toBe(75);
    expect(v.margin).toBe(5);
    expect(v.retake).toEqual([]);
  });
  it('A2: 100 / 100 / 60 / 40 → total 75 → pass; 100 / 100 / 40 / 40 → 70 → pass; 100 / 100 / 40 / 39 → fail', () => {
    expect(verdict({ listening: 100, reading: 100, writing: 60, speaking: 40 }, {}, 'A2').verdict).toBe(
      'pass',
    );
    expect(verdict({ listening: 100, reading: 100, writing: 40, speaking: 40 }, {}, 'A2').verdict).toBe(
      'pass',
    );
    expect(verdict({ listening: 100, reading: 100, writing: 40, speaking: 39 }, {}, 'A2').verdict).toBe(
      'fail',
    );
  });
  it('B1 weighted: one-section shortfalls are summed, not gated', () => {
    expect(weightedTotal({ listening: 80, reading: 80, writing: 60, speaking: 60 }, 'B1')).toBe(70);
    expect(verdict({ listening: 80, reading: 80, writing: 60, speaking: 60 }, {}, 'B1').verdict).toBe(
      'pass',
    );
    expect(verdict({ listening: 80, reading: 80, writing: 60, speaking: 59.9 }, {}, 'B1').verdict).toBe(
      'fail',
    );
  });
  it('B2 uses the 40/30/30 weights (60 band floor)', () => {
    expect(weightedTotal({ reading: 50, writing: 70, speaking: 70 }, 'B2')).toBe(62);
    expect(verdict({ reading: 50, writing: 70, speaking: 70 }, {}, 'B2').verdict).toBe('pass');
    expect(verdict({ reading: 40, writing: 70, speaking: 70 }, {}, 'B2').verdict).toBe('fail');
  });
});

describe('rounding rule (stricter reading, written in the names)', () => {
  it('a total of 69.96 % FAILS (compared unrounded, not rounded to 70.0)', () => {
    const v = verdict({ listening: 69.9, reading: 69.9, writing: 70, speaking: 70.04 }, {}, 'A1');
    expect(v.total).toBeCloseTo(69.96, 6);
    expect(v.verdict).toBe('fail');
  });
  it('float noise at exactly 70 does not fail it (0.1 + 0.2 style sums)', () => {
    expect(verdict({ listening: 70.1, reading: 69.9, writing: 70.2, speaking: 69.8 }, {}, 'A1').verdict).toBe(
      'pass',
    );
  });
});

describe('pending and provisional', () => {
  it('a missing section → verdict null, names the missing ones in section order', () => {
    const v = verdict({ listening: 90, reading: 90 }, {}, 'B1');
    expect(v.verdict).toBeNull();
    expect(v.missing).toEqual(['writing', 'speaking']);
    expect(v.provisional).toBe(false);
  });
  it('lexgram is not a section: its pct never changes the total', () => {
    const v = verdict({ ...all('A1', 70), lexgram: 0 }, {}, 'A1');
    expect(v.verdict).toBe('pass');
  });
  it('provisional is OR-ed over the sections of the level', () => {
    expect(verdict(all('A1', 80), { writing: true }, 'A1').provisional).toBe(true);
    expect(verdict(all('A1', 80), { lexgram: true }, 'A1').provisional).toBe(false);
  });
  it('per-section rows carry pct, weight and the vs-threshold margin', () => {
    const v = verdict({ listening: 90, reading: 60, writing: 70, speaking: 80 }, {}, 'A1');
    expect(v.sections.map((s) => [s.kind, s.vsThreshold])).toEqual([
      ['listening', 20],
      ['reading', -10],
      ['writing', 0],
      ['speaking', 10],
    ]);
  });
});

describe('predictVerdict (readiness line: unknown = fail)', () => {
  it('the legacy SPbU rule is no longer exported from readiness (UT16b)', () => {
    expect('predictVerdict' in readiness).toBe(false);
  });
  it('an unknown section can never predict a pass, even when the rest would carry the total', () => {
    const r = predictVerdict({ listening: 100, reading: 100, writing: 100 }, 'A1');
    expect(r.verdict).toBe('fail');
    expect(predictVerdict({}, 'B1').verdict).toBe('fail');
  });
  it('known sections at the threshold pass', () => {
    expect(predictVerdict(all('B1', 70), 'B1').verdict).toBe('pass');
  });
});

describe('per-section floor stays data-only (if the Commission adds one)', () => {
  it('retake names sections under perSectionMinPct only when the shape carries one', () => {
    // No shape has a floor today → retake is always [].
    for (const level of EXAM_LEVELS) expect(predictVerdict(all(level, 0), level).retake).toEqual([]);
  });
});

describe('headline and margin copy', () => {
  it('headline', () => {
    expect(verdictHeadline('pass')).toBe('Склав би');
    expect(verdictHeadline('fail')).toBe('Не склав би');
  });
  it('margin: pass shows запас (floored), fail shows бракує (rounded UP so 0,0 never appears)', () => {
    expect(marginLabel(0)).toBe('запас 0,0 п. п.');
    expect(marginLabel(4.27)).toBe('запас 4,2 п. п.');
    expect(marginLabel(-0.04)).toBe('бракує 0,1 п. п.');
    expect(marginLabel(-1.3)).toBe('бракує 1,3 п. п.');
  });
});
