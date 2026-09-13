import { getVoice, hasSpeaker, SYSTEM_VOICE_ID } from './catalog';

/**
 * Pure engine routing (T11): which TTS actually speaks a request. Kept
 * free of native/store imports so the fallback rules are unit-testable —
 * the design §11 guarantee ("speech never hard-fails") lives here.
 */

export type TtsEngine = 'piper' | 'system';

export interface EngineChoice {
  engine: TtsEngine;
  voiceId: string;
}

/**
 * An explicit request wins over the app-wide selection; anything that is
 * not a known, installed Piper voice routes to the system engine.
 */
export function pickEngine(
  requestedVoiceId: string | undefined,
  selectedVoiceId: string,
  installedVoiceIds: readonly string[],
): EngineChoice {
  const candidate = requestedVoiceId ?? selectedVoiceId;
  if (
    candidate !== SYSTEM_VOICE_ID &&
    getVoice(candidate) !== undefined &&
    installedVoiceIds.includes(candidate)
  ) {
    return { engine: 'piper', voiceId: candidate };
  }
  return { engine: 'system', voiceId: SYSTEM_VOICE_ID };
}

/**
 * Which speaker of `voiceId` speaks (UT05 multi-speaker voices): an explicit
 * request wins; otherwise the app selection's sid applies only when the
 * voice is the selected one (a different voice's sid means nothing here).
 * Anything the voice does not declare → speaker 0, never a native error.
 */
export function pickSpeaker(
  voiceId: string,
  requestedSid: number | undefined,
  selectedVoiceId: string,
  selectedSid: number,
): number {
  const voice = getVoice(voiceId);
  if (!voice) return 0;
  const candidate = requestedSid ?? (voiceId === selectedVoiceId ? selectedSid : 0);
  return hasSpeaker(voice, candidate) ? candidate : 0;
}

/** Clamp a user/UI rate multiplier to what both engines handle sanely. */
export function clampRate(rate: number | undefined): number {
  if (!rate || !Number.isFinite(rate)) return 1;
  return Math.min(2, Math.max(0.5, rate));
}
