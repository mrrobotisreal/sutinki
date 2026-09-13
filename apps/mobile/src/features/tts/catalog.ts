import { z } from 'zod';

/**
 * The Piper Ukrainian voice catalog (UT05, ADR-0005). sherpa-onnx's
 * `tts-models` release carries exactly two `uk_UA` Piper voices; both ship
 * here at full precision (the int8/fp16 variants are unused — quality first,
 * both archives clear GitHub's 100 MB mirror limit anyway).
 *
 * Sourcing (T23, V2 §2): voices install manifest-first from the content
 * repo's `models/tts/` mirror (resolved via `features/models/`), with the
 * k2-fsa release-asset URL + sha256 pinned below kept as the documented
 * last-resort fallback — NOT dead code (until UT07 mirrors them it is the
 * only source). The sha256 of every archive is verified before install
 * whichever source served it; a pin test asserts both sources claim the
 * same hash per model id.
 *
 * Speakers: a Piper archive is one download but may hold several speakers
 * (`num_speakers` in its `.onnx.json`, addressed by `sid` at synthesis).
 * `ukrainian_tts-medium` declares three, so a selection is a (voice, sid)
 * pair; single-speaker voices always use sid 0.
 */

const RELEASE_BASE = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models';

export interface PiperSpeaker {
  /** The model's speaker id (`speaker_id_map` value), passed to native `speak`. */
  sid: number;
  /** Human name for the picker row. */
  displayName: string;
  /** One-line description (gender/flavor). */
  description: string;
}

export interface PiperVoice {
  /** Stable id used in settings, storage paths, analytics. */
  id: string;
  /** Human name for the Settings list. */
  displayName: string;
  /** One-line description (quality/sample rate) for the list row. */
  description: string;
  archiveUrl: string;
  archiveSha256: string;
  archiveBytes: number;
  /** Top-level directory inside the archive (Piper convention). */
  dirName: string;
  /** Model filename inside dirName. */
  modelFile: string;
  /** Sample rate declared by the model's `.onnx.json` (informational). */
  sampleRate: number;
  /** Speakers in `sid` order; length === the model's `num_speakers`. */
  speakers: readonly PiperSpeaker[];
}

interface PiperVoiceSpec {
  /** `<name>` and `<quality>` in `vits-piper-uk_UA-<name>-<quality>`. */
  name: string;
  quality: 'x_low' | 'low' | 'medium' | 'high';
  displayName: string;
  description: string;
  archiveSha256: string;
  archiveBytes: number;
  sampleRate: number;
  speakers: readonly PiperSpeaker[];
}

function piperVoice(spec: PiperVoiceSpec): PiperVoice {
  const dirName = `vits-piper-uk_UA-${spec.name}-${spec.quality}`;
  return {
    id: `piper-uk-${spec.name.replace(/_/g, '-')}`,
    displayName: spec.displayName,
    description: spec.description,
    archiveUrl: `${RELEASE_BASE}/${dirName}.tar.bz2`,
    archiveSha256: spec.archiveSha256,
    archiveBytes: spec.archiveBytes,
    dirName,
    modelFile: `uk_UA-${spec.name}-${spec.quality}.onnx`,
    sampleRate: spec.sampleRate,
    speakers: spec.speakers,
  };
}

/**
 * sha256/bytes computed from the upstream archives downloaded on
 * 2026-09-13 (`shasum -a 256` / `stat -f %z`); `.onnx.json` facts read
 * from the extracted archives the same day. Never copied from a doc.
 */
export const PIPER_VOICES: readonly PiperVoice[] = [
  piperVoice({
    name: 'lada',
    quality: 'x_low',
    displayName: 'Лада',
    description: 'Жіночий · легкий і швидкий · 16 кГц',
    archiveSha256: '7a2228f249299d19016cd6ca170bf6916f8664231bcbd9e61f447b861a039cf5',
    archiveBytes: 26_520_908,
    sampleRate: 16_000,
    speakers: [{ sid: 0, displayName: 'Лада', description: 'Жіночий' }],
  }),
  piperVoice({
    name: 'ukrainian_tts',
    quality: 'medium',
    displayName: 'Лада · Микита · Тетяна',
    description: 'Три голоси · чіткіший · 22 кГц',
    archiveSha256: '92be6ff21ebb1cbcc0c71121a6437db8d060cee5785287aaa6a19a2548f59c03',
    archiveBytes: 80_355_083,
    sampleRate: 22_050,
    // speaker_id_map: { lada: 0, mykyta: 1, tetiana: 2 }
    speakers: [
      { sid: 0, displayName: 'Лада', description: 'Жіночий' },
      { sid: 1, displayName: 'Микита', description: 'Чоловічий' },
      { sid: 2, displayName: 'Тетяна', description: 'Жіночий' },
    ],
  }),
] as const;

/** The voice Settings offers first (smallest download, single speaker). */
export const DEFAULT_VOICE_ID = 'piper-uk-lada';

export function getVoice(id: string): PiperVoice | undefined {
  return PIPER_VOICES.find((v) => v.id === id);
}

/** True when `sid` addresses a speaker the voice actually declares. */
export function hasSpeaker(voice: PiperVoice, sid: number): boolean {
  return voice.speakers.some((s) => s.sid === sid);
}

/** Sentinel voice id meaning "use the Android system TTS via expo-speech". */
export const SYSTEM_VOICE_ID = 'system';

/** Speaker id at the native boundary: a small non-negative integer. */
export const speakerIdSchema = z.number().int().min(0).max(255);

/**
 * The persisted `tts.voice` settings value (standard DoD: Zod at the
 * settings I/O boundary). `selectedSid` is optional so pre-UT05 rows
 * (`{ selectedVoiceId }` only) still parse; absent = speaker 0. Unknown
 * voice, or a sid the voice does not declare → system fallback.
 */
export const ttsVoiceSettingSchema = z
  .strictObject({
    selectedVoiceId: z.string(),
    selectedSid: speakerIdSchema.optional(),
  })
  .refine(
    (v) => {
      if (v.selectedVoiceId === SYSTEM_VOICE_ID) return v.selectedSid === undefined;
      const voice = getVoice(v.selectedVoiceId);
      return voice !== undefined && hasSpeaker(voice, v.selectedSid ?? 0);
    },
    { message: 'unknown voice id or speaker' },
  );

export type TtsVoiceSetting = z.infer<typeof ttsVoiceSettingSchema>;

/** The normalized selection the app runs on: always a concrete sid. */
export interface TtsVoiceSelection {
  selectedVoiceId: string;
  selectedSid: number;
}

export const SYSTEM_SELECTION: TtsVoiceSelection = {
  selectedVoiceId: SYSTEM_VOICE_ID,
  selectedSid: 0,
};

/** Parse a stored settings value; anything invalid falls back to system TTS. */
export function parseTtsVoiceSetting(stored: unknown): TtsVoiceSelection {
  const parsed = ttsVoiceSettingSchema.safeParse(stored);
  if (!parsed.success) return SYSTEM_SELECTION;
  return {
    selectedVoiceId: parsed.data.selectedVoiceId,
    selectedSid: parsed.data.selectedSid ?? 0,
  };
}

/** The value written back to `tts.voice` for a selection (schema-shaped). */
export function toTtsVoiceSetting(selection: TtsVoiceSelection): TtsVoiceSetting {
  if (selection.selectedVoiceId === SYSTEM_VOICE_ID) return { selectedVoiceId: SYSTEM_VOICE_ID };
  return { selectedVoiceId: selection.selectedVoiceId, selectedSid: selection.selectedSid };
}

/** "26.5 MB" style formatting for the Settings storage accounting. */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 100) return `${Math.round(mb)} MB`;
  return `${mb.toFixed(1)} MB`;
}
