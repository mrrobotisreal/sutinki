import { describe, expect, it } from 'vitest';

import { SYSTEM_VOICE_ID } from '../catalog';
import { clampRate, pickEngine, pickSpeaker } from '../engine';

const LADA = 'piper-uk-lada';
const MEDIUM = 'piper-uk-ukrainian-tts';

describe('pickEngine', () => {
  it('uses the selected piper voice when installed', () => {
    expect(pickEngine(undefined, LADA, [LADA])).toEqual({
      engine: 'piper',
      voiceId: LADA,
    });
  });

  it('falls back to system with zero voices installed (ticket acceptance)', () => {
    expect(pickEngine(undefined, LADA, [])).toEqual({
      engine: 'system',
      voiceId: SYSTEM_VOICE_ID,
    });
  });

  it('routes the system selection to system even with voices installed', () => {
    expect(pickEngine(undefined, SYSTEM_VOICE_ID, [LADA])).toEqual({
      engine: 'system',
      voiceId: SYSTEM_VOICE_ID,
    });
  });

  it('lets an explicit request override the app selection', () => {
    expect(pickEngine(MEDIUM, LADA, [LADA, MEDIUM])).toEqual({
      engine: 'piper',
      voiceId: MEDIUM,
    });
    expect(pickEngine(SYSTEM_VOICE_ID, LADA, [LADA])).toEqual({
      engine: 'system',
      voiceId: SYSTEM_VOICE_ID,
    });
  });

  it('routes unknown or uninstalled requests to system', () => {
    expect(pickEngine('piper-uk-vanished', LADA, [LADA]).engine).toBe('system');
    expect(pickEngine(MEDIUM, LADA, [LADA]).engine).toBe('system');
  });
});

describe('pickSpeaker (UT05 multi-speaker voices)', () => {
  it('uses the selected speaker when the voice is the selected one', () => {
    expect(pickSpeaker(MEDIUM, undefined, MEDIUM, 2)).toBe(2);
  });

  it('ignores the selected sid when a different voice is requested', () => {
    expect(pickSpeaker(LADA, undefined, MEDIUM, 2)).toBe(0);
  });

  it('lets an explicit request override the app selection', () => {
    expect(pickSpeaker(MEDIUM, 1, MEDIUM, 2)).toBe(1);
  });

  it('never returns a speaker the voice does not declare', () => {
    expect(pickSpeaker(LADA, 1, LADA, 1)).toBe(0);
    expect(pickSpeaker(MEDIUM, 3, MEDIUM, 0)).toBe(0);
    expect(pickSpeaker(MEDIUM, undefined, MEDIUM, 7)).toBe(0);
    expect(pickSpeaker('piper-uk-vanished', 1, MEDIUM, 1)).toBe(0);
  });
});

describe('clampRate', () => {
  it('defaults absent/invalid rates to 1', () => {
    expect(clampRate(undefined)).toBe(1);
    expect(clampRate(0)).toBe(1);
    expect(clampRate(Number.NaN)).toBe(1);
    expect(clampRate(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it('clamps to the sane [0.5, 2] band', () => {
    expect(clampRate(0.2)).toBe(0.5);
    expect(clampRate(3)).toBe(2);
  });

  it('passes through narration-range rates untouched', () => {
    expect(clampRate(0.7)).toBe(0.7);
    expect(clampRate(1.25)).toBe(1.25);
  });
});
