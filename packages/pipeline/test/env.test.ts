import { describe, expect, it } from 'vitest';
import { ElevenLabsError } from '../src/elevenlabs.ts';
import { resolveElevenKey } from '../src/env.ts';

/** UP03 Decisions 1–2: `ELEVENLABS_API_KEY_2` wins; the plain name is a warned fallback. */
describe('resolveElevenKey', () => {
  const SECRET_2 = 'fake-key-two-0123456789';
  const SECRET_1 = 'fake-key-one-9876543210';

  it('prefers ELEVENLABS_API_KEY_2 over ELEVENLABS_API_KEY', () => {
    const k = resolveElevenKey('/nonexistent', {
      ELEVENLABS_API_KEY_2: SECRET_2,
      ELEVENLABS_API_KEY: SECRET_1,
    });
    expect(k).toEqual({ name: 'ELEVENLABS_API_KEY_2', value: SECRET_2 });
  });

  it('falls back to the plain ELEVENLABS_API_KEY and reports which name supplied it', () => {
    const k = resolveElevenKey('/nonexistent', { ELEVENLABS_API_KEY: SECRET_1 });
    expect(k).toEqual({ name: 'ELEVENLABS_API_KEY', value: SECRET_1 });
  });

  it('treats an empty _2 as absent', () => {
    const k = resolveElevenKey('/nonexistent', {
      ELEVENLABS_API_KEY_2: '',
      ELEVENLABS_API_KEY: SECRET_1,
    });
    expect(k?.name).toBe('ELEVENLABS_API_KEY');
  });

  it('returns undefined when neither is set (the injected env is the only source consulted)', () => {
    expect(resolveElevenKey('/nonexistent', {})).toBeUndefined();
  });

  it('the key value never appears in an ElevenLabsError (redacted backstop)', () => {
    const err = new ElevenLabsError(`request failed for ${SECRET_2}`, SECRET_2);
    expect(String(err)).not.toContain(SECRET_2);
    expect(err.message).not.toContain(SECRET_2);
  });
});
