import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SETTING_KEYS } from '@/db/repositories/settings';

import {
  DEFAULT_EXAM_GRADING_PRESET,
  DEFAULT_TORFL_PREFS,
  parseExamDate,
  parseTorflPrefs,
  sanitizeExamGradingPreset,
} from '../settings-core';
import { TORFL_PROFILES } from '../level-profile';
import {
  getExamDate,
  getExamDates,
  getExamGradingPreset,
  getStoredLevel,
  setStoredLevel,
  getTorflPrefs,
  setExamDate,
  setExamGradingPreset,
  setTorflPrefs,
} from '../settings';

const settingsStore = vi.hoisted(() => new Map<string, unknown>());

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock('@/db', () => ({
  repos: {
    settings: {
      get: vi.fn(async (key: string) => settingsStore.get(key) ?? null),
      set: vi.fn(async (key: string, value: unknown) => {
        settingsStore.set(key, value);
      }),
      remove: vi.fn(async (key: string) => {
        settingsStore.delete(key);
      }),
    },
  },
}));

beforeEach(() => settingsStore.clear());

describe('SETTING_KEYS (T68)', () => {
  it('declares the three torfl keys', () => {
    expect(SETTING_KEYS.torflPrefs).toBe('torfl.prefs');
    expect(SETTING_KEYS.torflExamDate).toBe('torfl.examDate');
    expect(SETTING_KEYS.torflGradingPreset).toBe('torfl.gradingPreset');
  });
});

describe('torfl.prefs healing', () => {
  it('defaults match TORFL §4.4', () => {
    expect(DEFAULT_TORFL_PREFS).toEqual({
      v: 1,
      instructionLang: 'uk',
      drillTimer: 'off',
      breakBetweenSubtests: true,
      allowLookupInMockReading: true,
    });
  });

  it.each([null, undefined, 'garbage', 42, [], '{"v":1'])('%j heals to the defaults', (raw) => {
    expect(parseTorflPrefs(raw)).toEqual(DEFAULT_TORFL_PREFS);
  });

  it('heals field-by-field: a bad drillTimer never resets the other fields', () => {
    expect(
      parseTorflPrefs({
        v: 7,
        instructionLang: 'en',
        drillTimer: 'turbo',
        breakBetweenSubtests: 'yes',
        allowLookupInMockReading: false,
        extra: 1,
      }),
    ).toEqual({
      v: 1,
      instructionLang: 'en',
      drillTimer: 'off',
      breakBetweenSubtests: true,
      allowLookupInMockReading: false,
    });
  });

  it('T77: a legacy showEnglishInstructions row heals to instructionLang ru (other fields kept)', () => {
    expect(
      parseTorflPrefs({
        v: 1,
        showEnglishInstructions: true,
        drillTimer: 'exam-pace',
        breakBetweenSubtests: false,
        allowLookupInMockReading: true,
      }),
    ).toEqual({
      v: 1,
      instructionLang: 'uk',
      drillTimer: 'exam-pace',
      breakBetweenSubtests: false,
      allowLookupInMockReading: true,
    });
    expect(parseTorflPrefs({ instructionLang: 'de' }).instructionLang).toBe('uk');
  });

  it('a valid value passes through untouched', () => {
    const v = { ...DEFAULT_TORFL_PREFS, drillTimer: 'exam-pace' as const };
    expect(parseTorflPrefs(v)).toEqual(v);
  });

  it('accessor reads healed and writes merged patches', async () => {
    expect(await getTorflPrefs()).toEqual(DEFAULT_TORFL_PREFS);
    settingsStore.set('torfl.prefs', { drillTimer: 99, instructionLang: 'en' });
    expect(await getTorflPrefs()).toMatchObject({
      drillTimer: 'off',
      instructionLang: 'en',
    });
    const next = await setTorflPrefs({ drillTimer: 'exam-pace' });
    expect(next).toMatchObject({ drillTimer: 'exam-pace', instructionLang: 'en' });
    expect(settingsStore.get('torfl.prefs')).toEqual(next);
  });
});

describe('torfl.examDate healing', () => {
  it.each([
    ['2026-12-05', '2026-12-05'],
    ['2026-02-30', null],
    ['2026-1-5', null],
    ['tomorrow', null],
    [20261205, null],
    [null, null],
    [{ date: '2026-12-05' }, null],
  ])('%j → %j', (raw, expected) => {
    expect(parseExamDate(raw)).toBe(expected);
  });

  it('accessor sets, heals and clears', async () => {
    expect(await getExamDate()).toBeNull();
    await setExamDate('2026-12-05');
    expect(await getExamDate()).toBe('2026-12-05');
    await expect(setExamDate('2026-13-01')).rejects.toThrow();
    settingsStore.set('torfl.examDate', 'garbage');
    expect(await getExamDate()).toBeNull();
    await setExamDate(null);
    expect(settingsStore.has('torfl.examDate')).toBe(false);
  });
});

describe('torfl.examDateA2 (T75, TORFL_A2 A2-5)', () => {
  it('declares the A2 key; A1 keeps torfl.examDate', () => {
    expect(SETTING_KEYS.torflExamDateA2).toBe('torfl.examDateA2');
    expect(TORFL_PROFILES.A2.examDateKey).toBe(SETTING_KEYS.torflExamDateA2);
    expect(TORFL_PROFILES.A1.examDateKey).toBe(SETTING_KEYS.torflExamDate);
  });

  it('A2 date persists and heals independently of A1', async () => {
    await setExamDate('2026-12-05', 'A2');
    expect(await getExamDate('A2')).toBe('2026-12-05');
    expect(await getExamDate('A1')).toBeNull();

    await setExamDate('2027-01-10', 'A1');
    expect(await getExamDate('A2')).toBe('2026-12-05');
    expect(await getExamDate('A1')).toBe('2027-01-10');

    await expect(setExamDate('2026-13-01', 'A2')).rejects.toThrow();
    settingsStore.set('torfl.examDateA2', 'garbage');
    expect(await getExamDate('A2')).toBeNull();
    expect(await getExamDate('A1')).toBe('2027-01-10');
  });

  it('clearing A2 removes only that key', async () => {
    await setExamDate('2026-12-05', 'A1');
    await setExamDate('2026-12-06', 'A2');
    await setExamDate(null, 'A2');
    expect(settingsStore.has('torfl.examDateA2')).toBe(false);
    expect(settingsStore.get('torfl.examDate')).toBe('2026-12-05');
  });

  it('an old backup without the newer keys restores with those levels = null', async () => {
    settingsStore.set('torfl.examDate', '2026-12-05');
    expect(await getExamDates()).toEqual({
      A1: '2026-12-05',
      A2: null,
      B1: null,
      B2: null,
      C1: null,
    });
  });
});

describe('B1 / B2 / C1 exam dates and the stored level (UT16b)', () => {
  it('declares the keys and the profiles point at them', () => {
    expect(SETTING_KEYS.torflExamDateB1).toBe('torfl.examDateB1');
    expect(SETTING_KEYS.torflExamDateB2).toBe('torfl.examDateB2');
    expect(SETTING_KEYS.torflExamDateC1).toBe('torfl.examDateC1');
    expect(SETTING_KEYS.torflLevel).toBe('torfl.level');
    expect(TORFL_PROFILES.B1.examDateKey).toBe(SETTING_KEYS.torflExamDateB1);
    expect(TORFL_PROFILES.B2.examDateKey).toBe(SETTING_KEYS.torflExamDateB2);
    expect(TORFL_PROFILES.C1.examDateKey).toBe(SETTING_KEYS.torflExamDateC1);
  });

  it('each date persists independently; getExamDates returns all five levels', async () => {
    await setExamDate('2027-05-04', 'B1');
    await setExamDate('2027-06-01', 'C1');
    expect(await getExamDate('B1')).toBe('2027-05-04');
    expect(await getExamDate('B2')).toBeNull();
    expect(await getExamDates()).toEqual({
      A1: null,
      A2: null,
      B1: '2027-05-04',
      B2: null,
      C1: '2027-06-01',
    });
    await setExamDate(null, 'B1');
    expect(settingsStore.has('torfl.examDateB1')).toBe(false);
    expect(settingsStore.has('torfl.examDateC1')).toBe(true);
  });

  it('a garbage B2 date heals to null', async () => {
    settingsStore.set('torfl.examDateB2', 'garbage');
    expect(await getExamDate('B2')).toBeNull();
  });

  it('torfl.level: stored level round-trips; anything unknown heals to null', async () => {
    expect(await getStoredLevel()).toBeNull();
    await setStoredLevel('B1');
    expect(settingsStore.get('torfl.level')).toBe('B1');
    expect(await getStoredLevel()).toBe('B1');
    settingsStore.set('torfl.level', 'D9');
    expect(await getStoredLevel()).toBeNull();
    settingsStore.set('torfl.level', 7);
    expect(await getStoredLevel()).toBeNull();
  });
});

describe('torfl.gradingPreset healing', () => {
  it('default = Anthropic · normal · high (ADR-0020 decision 10)', () => {
    expect(DEFAULT_EXAM_GRADING_PRESET).toEqual({
      provider: 'anthropic',
      quality: 'normal',
      effort: 'high',
    });
  });

  it('heals field-by-field against the given fallback; stores only the triple', () => {
    const fallback = {
      provider: 'openai' as const,
      quality: 'normal' as const,
      effort: 'high' as const,
    };
    expect(sanitizeExamGradingPreset('nope', fallback)).toEqual(fallback);
    expect(
      sanitizeExamGradingPreset(
        { provider: 'mistral', quality: 'best', effort: 9, model: 'x' },
        fallback,
      ),
    ).toEqual({ provider: 'openai', quality: 'best', effort: 'high' });
  });

  it('accessor: absent → provider follows the grammar preset, quality normal, effort high', async () => {
    expect(await getExamGradingPreset()).toEqual(DEFAULT_EXAM_GRADING_PRESET);
    settingsStore.set('ai.grammarPreset', {
      v: 1,
      provider: 'openai',
      quality: 'fast',
      effort: 'low',
    });
    expect(await getExamGradingPreset()).toEqual({
      provider: 'openai',
      quality: 'normal',
      effort: 'high',
    });
    settingsStore.set('torfl.gradingPreset', { v: 1, provider: 'anthropic', quality: 'zzz' });
    expect(await getExamGradingPreset()).toEqual({
      provider: 'anthropic',
      quality: 'normal',
      effort: 'high',
    });
    await setExamGradingPreset({ provider: 'anthropic', quality: 'best', effort: 'ultra' });
    expect(settingsStore.get('torfl.gradingPreset')).toEqual({
      v: 1,
      provider: 'anthropic',
      quality: 'best',
      effort: 'ultra',
    });
  });
});
