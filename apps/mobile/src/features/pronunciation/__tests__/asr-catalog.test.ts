import { describe, expect, it } from 'vitest';

import { ASR_MODEL, asrModelSchema, transcriptResultSchema } from '../asr-catalog';

/** T12 → UT06: the model pin + the Zod boundary for native transcripts. */

describe('ASR_MODEL (UT06: NeMo fast-conformer transducer uk, ADR-0005)', () => {
  it('pins the upstream archive precisely (url embeds dirName, sha256 well-formed)', () => {
    expect(ASR_MODEL.archiveUrl).toContain(`${ASR_MODEL.dirName}.tar.bz2`);
    expect(ASR_MODEL.archiveSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(ASR_MODEL.archiveBytes).toBeGreaterThan(0);
  });

  it('is the bake-off winner: NeMo transducer, k2-fsa asr-models release, int8 files', () => {
    expect(ASR_MODEL.id).toBe('nemo-fastconformer-uk-int8');
    expect(ASR_MODEL.modelType).toBe('nemo_transducer');
    expect(ASR_MODEL.archiveUrl).toMatch(
      /^https:\/\/github\.com\/k2-fsa\/sherpa-onnx\/releases\/download\/asr-models\/sherpa-onnx-nemo-fast-conformer-transducer-.*-uk-20k-int8\.tar\.bz2$/,
    );
    expect(ASR_MODEL.files).toEqual({
      encoder: 'encoder.int8.onnx',
      decoder: 'decoder.int8.onnx',
      joiner: 'joiner.int8.onnx',
      tokens: 'tokens.txt',
    });
    // > 100 MB → unmirrored by design (the honest "from k2-fsa" install copy keys off this).
    expect(ASR_MODEL.mirrored).toBe(false);
    expect(ASR_MODEL.displayName).toBe('Розпізнавання українського мовлення');
  });

  it('the catalog entry schema rejects unknown model types and partial file maps', () => {
    expect(() => asrModelSchema.parse({ ...ASR_MODEL, modelType: 'whisper' })).toThrow();
    expect(() =>
      asrModelSchema.parse({ ...ASR_MODEL, files: { encoder: 'e', tokens: 't' } }),
    ).toThrow();
    expect(() => asrModelSchema.parse({ ...ASR_MODEL, archiveSha256: 'abc' })).toThrow();
  });
});

describe('transcriptResultSchema', () => {
  it('accepts the native module contract', () => {
    const parsed = transcriptResultSchema.parse({
      text: 'я чую стук',
      words: [
        { word: 'я', startMs: 0, endMs: 200 },
        { word: 'чую', startMs: 200, endMs: 700 },
        { word: 'стук', startMs: 700, endMs: 1100 },
      ],
      decodeMs: 350,
      audioMs: 1800,
    });
    expect(parsed.words).toHaveLength(3);
  });

  it('rejects malformed word entries and unknown keys (strictObject)', () => {
    expect(() =>
      transcriptResultSchema.parse({
        text: 'x',
        words: [{ word: 'x', startMs: '0', endMs: 1 }],
        decodeMs: 1,
        audioMs: 1,
      }),
    ).toThrow();
    expect(() =>
      transcriptResultSchema.parse({
        text: 'x',
        words: [],
        decodeMs: 1,
        audioMs: 1,
        confidence: 0.5,
      }),
    ).toThrow();
  });
});
