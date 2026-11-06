import { describe, expect, it } from 'vitest';

import type { ExamDates } from '../levels-today';
import { anyExamDate, isLevelActive, levelOrder } from '../levels-today';

const ALL = ['A1', 'A2', 'B1', 'B2', 'C1'];

describe('levelOrder', () => {
  it('no dates → the fixed order A1 … C1', () => {
    expect(levelOrder({ A1: null, A2: null })).toEqual(ALL);
    expect(levelOrder({})).toEqual(ALL);
  });
  it('B1 / B2 / C1 dates order the five levels, nearest first', () => {
    const d: ExamDates = { A1: null, A2: null, B1: '2027-05-01', B2: '2027-03-01', C1: null };
    expect(levelOrder(d)).toEqual(['B2', 'B1', 'A1', 'A2', 'C1']);
  });
  it('a lone B1 date puts B1 first, the rest keep the fixed order', () => {
    expect(levelOrder({ B1: '2027-05-01' })).toEqual(['B1', 'A1', 'A2', 'B2', 'C1']);
  });
  it('only A2 dated → A2 first', () => {
    expect(levelOrder({ A1: null, A2: '2026-12-01' })).toEqual(['A2', 'A1', 'B1', 'B2', 'C1']);
  });
  it('only A1 dated → A1 first', () => {
    expect(levelOrder({ A1: '2026-12-01', A2: null })).toEqual(['A1', 'A2', 'B1', 'B2', 'C1']);
  });
  it('both dated, A2 sooner → A2 first', () => {
    expect(levelOrder({ A1: '2027-03-01', A2: '2026-12-01' })).toEqual(['A2', 'A1', 'B1', 'B2', 'C1']);
  });
  it('both dated, A1 sooner → A1 first', () => {
    expect(levelOrder({ A1: '2026-11-01', A2: '2027-02-01' })).toEqual(['A1', 'A2', 'B1', 'B2', 'C1']);
  });
  it('equal dates → A1 then A2', () => {
    expect(levelOrder({ A1: '2026-12-01', A2: '2026-12-01' })).toEqual(['A1', 'A2', 'B1', 'B2', 'C1']);
  });
  it('a past date counts as nearest (overdue first)', () => {
    expect(levelOrder({ A1: '2026-01-01', A2: '2026-12-01' })).toEqual(['A1', 'A2', 'B1', 'B2', 'C1']);
    expect(levelOrder({ A1: '2026-12-01', A2: '2026-01-01' })).toEqual(['A2', 'A1', 'B1', 'B2', 'C1']);
  });
  it('a dated level precedes an undated one regardless of the fixed order', () => {
    expect(levelOrder({ A1: null, A2: '2030-01-01' })).toEqual(['A2', 'A1', 'B1', 'B2', 'C1']);
  });
});

describe('isLevelActive', () => {
  it('is active with a date or with due items, inactive with neither', () => {
    expect(isLevelActive(null, 0)).toBe(false);
    expect(isLevelActive(null, 3)).toBe(true);
    expect(isLevelActive('2026-12-01', 0)).toBe(true);
  });
});

describe('anyExamDate', () => {
  it('is true iff any level has a date', () => {
    expect(anyExamDate({ A1: null, A2: null })).toBe(false);
    expect(anyExamDate({ A1: '2026-12-01', A2: null })).toBe(true);
    expect(anyExamDate({ A1: null, A2: '2026-12-01' })).toBe(true);
  });
});

describe('anyExamDate (five levels)', () => {
  it('sees B1 / B2 / C1 dates too', () => {
    expect(anyExamDate({ B1: '2027-05-01' })).toBe(true);
    expect(anyExamDate({ C1: '2027-05-01' })).toBe(true);
    expect(anyExamDate({ B1: null, B2: null, C1: null })).toBe(false);
  });
});
