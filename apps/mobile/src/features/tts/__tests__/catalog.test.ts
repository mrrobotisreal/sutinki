import { describe, expect, it } from 'vitest';

import {
  DEFAULT_VOICE_ID,
  formatBytes,
  getVoice,
  hasSpeaker,
  parseTtsVoiceSetting,
  PIPER_VOICES,
  SYSTEM_SELECTION,
  SYSTEM_VOICE_ID,
  toTtsVoiceSetting,
} from '../catalog';

describe('PIPER_VOICES catalog (UT05)', () => {
  it('ships exactly the two Piper uk_UA voices with unique ids', () => {
    expect(PIPER_VOICES.map((v) => v.id).sort()).toEqual([
      'piper-uk-lada',
      'piper-uk-ukrainian-tts',
    ]);
  });

  it('defaults to the smallest single-speaker voice', () => {
    expect(DEFAULT_VOICE_ID).toBe('piper-uk-lada');
    expect(getVoice(DEFAULT_VOICE_ID)?.speakers).toHaveLength(1);
  });

  it('pins a full sha256 and a plausible size for every archive', () => {
    for (const voice of PIPER_VOICES) {
      expect(voice.archiveSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(voice.archiveBytes).toBeGreaterThan(20_000_000);
      // Under GitHub's 100 MB per-file cap (mirrorable in UT07).
      expect(voice.archiveBytes).toBeLessThan(100 * 1024 * 1024);
    }
    expect(new Set(PIPER_VOICES.map((v) => v.archiveSha256)).size).toBe(PIPER_VOICES.length);
  });

  it('derives archive URLs and file names consistently (quality varies)', () => {
    for (const voice of PIPER_VOICES) {
      expect(voice.archiveUrl).toBe(
        `https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/${voice.dirName}.tar.bz2`,
      );
      expect(voice.dirName).toMatch(/^vits-piper-uk_UA-[a-z_]+-(x_low|low|medium|high)$/);
      expect(voice.modelFile).toBe(`${voice.dirName.replace('vits-piper-', '')}.onnx`);
    }
    expect(getVoice('piper-uk-lada')?.dirName).toBe('vits-piper-uk_UA-lada-x_low');
    expect(getVoice('piper-uk-ukrainian-tts')?.dirName).toBe(
      'vits-piper-uk_UA-ukrainian_tts-medium',
    );
  });

  it('declares speakers in sid order matching the models’ .onnx.json', () => {
    expect(getVoice('piper-uk-lada')?.speakers.map((s) => s.sid)).toEqual([0]);
    const medium = getVoice('piper-uk-ukrainian-tts')!;
    // speaker_id_map: { lada: 0, mykyta: 1, tetiana: 2 } (read 2026-09-13)
    expect(medium.speakers.map((s) => [s.sid, s.displayName])).toEqual([
      [0, 'Лада'],
      [1, 'Микита'],
      [2, 'Тетяна'],
    ]);
    expect(medium.sampleRate).toBe(22_050);
    expect(hasSpeaker(medium, 2)).toBe(true);
    expect(hasSpeaker(medium, 3)).toBe(false);
    expect(hasSpeaker(getVoice('piper-uk-lada')!, 1)).toBe(false);
  });

  it('getVoice finds by id and rejects unknowns', () => {
    expect(getVoice('piper-uk-lada')?.displayName).toBe('Лада');
    expect(getVoice('piper-ru-irina')).toBeUndefined();
    expect(getVoice(SYSTEM_VOICE_ID)).toBeUndefined();
  });
});

describe('parseTtsVoiceSetting', () => {
  it('accepts a stored piper selection, defaulting the speaker to 0', () => {
    expect(parseTtsVoiceSetting({ selectedVoiceId: 'piper-uk-lada' })).toEqual({
      selectedVoiceId: 'piper-uk-lada',
      selectedSid: 0,
    });
  });

  it('accepts a stored speaker of a multi-speaker voice', () => {
    expect(
      parseTtsVoiceSetting({ selectedVoiceId: 'piper-uk-ukrainian-tts', selectedSid: 2 }),
    ).toEqual({ selectedVoiceId: 'piper-uk-ukrainian-tts', selectedSid: 2 });
  });

  it('accepts the system sentinel', () => {
    expect(parseTtsVoiceSetting({ selectedVoiceId: SYSTEM_VOICE_ID })).toEqual(SYSTEM_SELECTION);
  });

  it.each([
    ['unknown voice id', { selectedVoiceId: 'piper-uk-vanished' }],
    ['a pre-UT05 Russian voice id', { selectedVoiceId: 'piper-ru-ruslan' }],
    ['a speaker the voice does not declare', { selectedVoiceId: 'piper-uk-lada', selectedSid: 1 }],
    [
      'a speaker past the medium voice’s three',
      { selectedVoiceId: 'piper-uk-ukrainian-tts', selectedSid: 3 },
    ],
    ['a negative speaker', { selectedVoiceId: 'piper-uk-ukrainian-tts', selectedSid: -1 }],
    ['a fractional speaker', { selectedVoiceId: 'piper-uk-ukrainian-tts', selectedSid: 1.5 }],
    ['a speaker on the system sentinel', { selectedVoiceId: SYSTEM_VOICE_ID, selectedSid: 0 }],
    ['extra keys (strict)', { selectedVoiceId: 'piper-uk-lada', rate: 2 }],
    ['wrong shape', { voice: 'piper-uk-lada' }],
    ['null', null],
    ['undefined (never stored)', undefined],
    ['garbage', 'piper-uk-lada'],
  ])('falls back to system for %s', (_label, stored) => {
    expect(parseTtsVoiceSetting(stored)).toEqual(SYSTEM_SELECTION);
  });
});

describe('toTtsVoiceSetting', () => {
  it('round-trips a speaker selection through the stored shape', () => {
    const selection = { selectedVoiceId: 'piper-uk-ukrainian-tts', selectedSid: 1 };
    const stored = toTtsVoiceSetting(selection);
    expect(stored).toEqual({ selectedVoiceId: 'piper-uk-ukrainian-tts', selectedSid: 1 });
    expect(parseTtsVoiceSetting(stored)).toEqual(selection);
  });

  it('writes the system sentinel without a speaker', () => {
    expect(toTtsVoiceSetting(SYSTEM_SELECTION)).toEqual({ selectedVoiceId: SYSTEM_VOICE_ID });
  });
});

describe('formatBytes', () => {
  it('formats voice-scale sizes with one decimal', () => {
    expect(formatBytes(26_520_908)).toBe('25.3 MB');
    expect(formatBytes(80_355_083)).toBe('76.6 MB');
  });

  it('drops decimals at 100 MB+', () => {
    expect(formatBytes(150_000_000)).toBe('143 MB');
  });

  it('treats zero/negative as empty', () => {
    expect(formatBytes(0)).toBe('0 MB');
    expect(formatBytes(-5)).toBe('0 MB');
  });
});
