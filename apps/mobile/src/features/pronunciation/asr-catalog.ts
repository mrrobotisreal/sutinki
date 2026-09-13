import { z } from 'zod';

import type { AsrModelType } from '../../../modules/sherpa-speech';

/**
 * The Ukrainian ASR model (UT06, ADR-0005). Chosen by the on-host bake-off
 * recorded in `UkrainianStories/_build/asr-bakeoff/RESULTS.md`: NVIDIA NeMo
 * fast-conformer **transducer** int8, multilingual (be de en es fr hr it pl
 * ru uk) — the lowest WER *with* per-token timestamps (14.1 % WER / 3.7 %
 * CER on 40 story sentences spoken by a natural Ukrainian voice, 40/40
 * clips with timestamps; Moonshine-uk was 3 points better on WER but
 * returns no timestamps and carries a non-commercial license; Whisper
 * tiny/base were 43–47 % WER).
 *
 * Sourcing: every Ukrainian-capable archive exceeds GitHub's 100 MB per-file
 * cap, so this is the one model with **no content-repo mirror** — installs
 * go straight to the pinned k2-fsa release asset (the shared resolver's
 * "upstream fallback" is the only source; see `mirrored: false` and the
 * Release-channel note in ADR-0005). Verified before use whichever source
 * served it.
 */

/** Transducer archives carry exactly these four files. */
export const asrTransducerFilesSchema = z.strictObject({
  encoder: z.string().min(1),
  decoder: z.string().min(1),
  joiner: z.string().min(1),
  tokens: z.string().min(1),
});

export const asrModelSchema = z.strictObject({
  /** Stable id used in storage paths, analytics, native load. */
  id: z.string().min(1),
  /** sherpa-onnx transducer flavour the native module loads this with. */
  modelType: z.enum(['transducer', 'nemo_transducer']),
  displayName: z.string().min(1),
  description: z.string().min(1),
  archiveUrl: z.string().url(),
  archiveSha256: z.string().regex(/^[0-9a-f]{64}$/),
  archiveBytes: z.number().int().positive(),
  /** Top-level directory inside the archive. */
  dirName: z.string().min(1),
  /** Filenames inside dirName that the recognizer needs (model-type-specific). */
  files: asrTransducerFilesSchema,
  /**
   * False = no `models-manifest.json` entry exists (archive > 100 MB); the
   * installer downloads from the upstream URL and the UI says so honestly.
   */
  mirrored: z.boolean(),
});

export type AsrModel = z.infer<typeof asrModelSchema> & { modelType: AsrModelType };

/**
 * sha256/bytes computed from the downloaded archive on 2026-09-13
 * (`shasum -a 256` / `stat -f %z` in the bake-off harness) — never copied.
 */
export const ASR_MODEL: AsrModel = asrModelSchema.parse({
  id: 'nemo-fastconformer-uk-int8',
  modelType: 'nemo_transducer',
  displayName: 'Розпізнавання українського мовлення',
  description: 'NeMo FastConformer · оцінює вимову без інтернету',
  archiveUrl:
    'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-fast-conformer-transducer-be-de-en-es-fr-hr-it-pl-ru-uk-20k-int8.tar.bz2',
  archiveSha256: '06072bad277f0f4c29cc866d7c62b0e47936da39afafeae453faa925025ccad6',
  archiveBytes: 106_546_673,
  dirName: 'sherpa-onnx-nemo-fast-conformer-transducer-be-de-en-es-fr-hr-it-pl-ru-uk-20k-int8',
  files: {
    encoder: 'encoder.int8.onnx',
    decoder: 'decoder.int8.onnx',
    joiner: 'joiner.int8.onnx',
    tokens: 'tokens.txt',
  },
  mirrored: false,
}) as AsrModel;

/**
 * Transcript shape at the JS/native boundary (standard DoD: Zod at every
 * I/O boundary). The native module *claims* this shape; parse before use.
 */
export const transcriptWordSchema = z.strictObject({
  word: z.string(),
  startMs: z.number(),
  endMs: z.number(),
});

export const transcriptResultSchema = z.strictObject({
  text: z.string(),
  words: z.array(transcriptWordSchema),
  decodeMs: z.number(),
  audioMs: z.number(),
});

export type TranscriptWord = z.infer<typeof transcriptWordSchema>;
export type TranscriptResult = z.infer<typeof transcriptResultSchema>;
