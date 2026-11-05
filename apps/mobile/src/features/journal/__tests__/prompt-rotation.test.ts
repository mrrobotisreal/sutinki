import { describe, expect, it } from 'vitest';

import {
  BUILTIN_PROMPT_PACK_ID,
  BUILTIN_PROMPTS,
  localDayKey,
  PromptRowSchema,
  selectDailyPrompt,
  type PromptRow,
} from '../prompt-rotation';

const prompt = (id: string, level: PromptRow['level']): PromptRow => ({
  packId: 'a1-prompts-001',
  id,
  level,
  promptUk: `ук-${id}`,
  promptEn: `en-${id}`,
  tags: null,
});

const PROMPTS: PromptRow[] = [
  prompt('a', 'A1'),
  prompt('b', 'A1'),
  prompt('c', 'A1'),
  prompt('d', 'A2'),
  prompt('e', 'B1'),
];

describe('selectDailyPrompt', () => {
  it('prefers exact-level prompts', () => {
    const picked = selectDailyPrompt(PROMPTS, 'A1', 0, 0);
    expect(picked?.level).toBe('A1');
  });

  it('rotates by day within the level pool', () => {
    const day0 = selectDailyPrompt(PROMPTS, 'A1', 0, 0)!;
    const day1 = selectDailyPrompt(PROMPTS, 'A1', 1, 0)!;
    const day3 = selectDailyPrompt(PROMPTS, 'A1', 3, 0)!;
    expect(day1.id).not.toBe(day0.id);
    expect(day3.id).toBe(day0.id); // 3 A1 prompts → period 3
  });

  it('same day is stable; skip advances within the day', () => {
    const first = selectDailyPrompt(PROMPTS, 'A1', 7, 0)!;
    expect(selectDailyPrompt(PROMPTS, 'A1', 7, 0)!.id).toBe(first.id);
    const skipped = selectDailyPrompt(PROMPTS, 'A1', 7, 1)!;
    expect(skipped.id).not.toBe(first.id);
    // skipping past the pool wraps around
    expect(selectDailyPrompt(PROMPTS, 'A1', 7, 3)!.id).toBe(first.id);
  });

  it('level with no prompts falls back to at-or-below levels', () => {
    const b2 = selectDailyPrompt(PROMPTS, 'B2', 0, 0)!;
    expect(['A1', 'A2', 'B1']).toContain(b2.level);
  });

  it('falls back to everything when nothing is at or below', () => {
    const onlyB1 = [prompt('x', 'B1')];
    expect(selectDailyPrompt(onlyB1, 'A1', 0, 0)?.id).toBe('x');
  });

  it('empty pool returns null', () => {
    expect(selectDailyPrompt([], 'A1', 0, 0)).toBeNull();
  });
});

describe('BUILTIN_PROMPTS (UT04 fallback)', () => {
  it('is a valid, unique, A1-only Ukrainian set of 10–14 prompts', () => {
    expect(BUILTIN_PROMPTS.length).toBeGreaterThanOrEqual(10);
    expect(BUILTIN_PROMPTS.length).toBeLessThanOrEqual(14);
    const ids = new Set<string>();
    for (const p of BUILTIN_PROMPTS) {
      expect(PromptRowSchema.safeParse(p).success).toBe(true);
      expect(p.packId).toBe(BUILTIN_PROMPT_PACK_ID);
      expect(p.level).toBe('A1');
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      // Ukrainian only: never a Russian-only letter, never Latin
      expect(p.promptUk).not.toMatch(/[ёыэъЁЫЭЪa-zA-Z]/); // intentional: Russian input (guard regex) upstream-ok
      expect(p.promptUk.split(/\s+/).length).toBeLessThanOrEqual(6);
    }
  });

  it('rotates through every built-in prompt at A1', () => {
    const seen = new Set<string>();
    for (let day = 0; day < BUILTIN_PROMPTS.length; day++) {
      seen.add(selectDailyPrompt([...BUILTIN_PROMPTS], 'A1', day, 0)!.id);
    }
    expect(seen.size).toBe(BUILTIN_PROMPTS.length);
  });
});

describe('localDayKey', () => {
  it('advances by 1 across a normal day boundary', () => {
    expect(localDayKey(new Date(2026, 7, 22)) - localDayKey(new Date(2026, 7, 21))).toBe(1);
  });

  it('changes across month boundaries', () => {
    expect(localDayKey(new Date(2026, 8, 1))).not.toBe(localDayKey(new Date(2026, 7, 31)));
  });
});
