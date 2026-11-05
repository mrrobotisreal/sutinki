import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL_ID, ElevenLabsClient, parseProviderVoice } from '../src/elevenlabs.ts';
import { DEFAULT_VOICE } from '../src/registers.ts';
import { VoiceDirectionSchema } from '../src/frontmatter.ts';

/** UP03 Decision 3: `elevenlabs:id:<voice_id>` is first-class and never lists voices. */
const MR_WINTROW = 'HQ4Xi3gPf8Q6bJUlao6z';

function countingFetch(calls: string[]): typeof fetch {
  return (async (url: string | URL | Request) => {
    calls.push(String(url));
    return Response.json({ voices: [{ voice_id: 'a'.repeat(20), name: 'Anton' }] });
  }) as typeof fetch;
}

describe('parseProviderVoice', () => {
  it('elevenlabs:id:<20> → kind id', () => {
    expect(parseProviderVoice(`elevenlabs:id:${MR_WINTROW}`, 'track "t"')).toEqual({
      provider: 'elevenlabs',
      kind: 'id',
      value: MR_WINTROW,
    });
  });

  it('legacy elevenlabs:<name> → kind name; a bare 20-char id passes through as an id', () => {
    expect(parseProviderVoice('elevenlabs:Anton', 'x').kind).toBe('name');
    expect(parseProviderVoice('elevenlabs:Mr. Wintrow', 'x')).toMatchObject({
      kind: 'name',
      value: 'Mr. Wintrow',
    });
    expect(parseProviderVoice(`elevenlabs:${MR_WINTROW}`, 'x')).toMatchObject({ kind: 'id' });
  });

  it('rejects an invalid id naming the draft entity and the expected form', () => {
    for (const bad of ['elevenlabs:id:short', `elevenlabs:id:${MR_WINTROW}X`, 'elevenlabs:id:']) {
      expect(() => parseProviderVoice(bad, 'character "host"')).toThrow(
        /character "host".*elevenlabs:id:/,
      );
    }
  });

  it('rejects other providers and an empty name', () => {
    expect(() => parseProviderVoice('openai:alloy', 'x')).toThrow(/unsupported voice/);
    expect(() => parseProviderVoice('elevenlabs:', 'x')).toThrow(/unsupported voice/);
  });
});

describe('ElevenLabsClient.resolveProviderVoice', () => {
  it('makes NO /v1/voices request for an elevenlabs:id: voice', async () => {
    const calls: string[] = [];
    const client = new ElevenLabsClient('k'.repeat(10), { fetchImpl: countingFetch(calls) });
    const id = await client.resolveProviderVoice(`elevenlabs:id:${MR_WINTROW}`, 'track "t"');
    expect(id).toBe(MR_WINTROW);
    expect(calls).toHaveLength(0);
  });

  it('still lists voices for the legacy name form', async () => {
    const calls: string[] = [];
    const client = new ElevenLabsClient('k'.repeat(10), { fetchImpl: countingFetch(calls) });
    expect(await client.resolveProviderVoice('elevenlabs:Anton', 'x')).toBe('a'.repeat(20));
    expect(calls.filter((c) => c.includes('/v1/voices'))).toHaveLength(1);
  });
});

describe('Sutinki defaults', () => {
  it('DEFAULT_MODEL_ID is eleven_v4 and DEFAULT_VOICE is Mr. Wintrow by id', () => {
    expect(DEFAULT_MODEL_ID).toBe('eleven_v4');
    expect(DEFAULT_VOICE).toBe(`elevenlabs:id:${MR_WINTROW}`);
  });

  it('draft frontmatter accepts elevenlabs:id:<voice_id>', () => {
    const r = VoiceDirectionSchema.safeParse({
      id: 't',
      style: 'neutral',
      voice: `elevenlabs:id:${MR_WINTROW}`,
      model: 'eleven_v4',
    });
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
  });
});
