import * as Speech from 'expo-speech';

import SherpaSpeech from '../../../modules/sherpa-speech';
import { repos } from '@/db';
import { SETTING_KEYS } from '@/db/repositories/settings';
import { track } from '@/services/analytics';
import { setSpeechService, type SpeakOptions } from '@/services/speech';

import {
  getVoice,
  parseTtsVoiceSetting,
  SYSTEM_VOICE_ID,
  toTtsVoiceSetting,
  type TtsVoiceSelection,
} from './catalog';
import { clampRate, pickEngine, pickSpeaker, type EngineChoice, type TtsEngine } from './engine';
import { isVoiceInstalled, refreshInstalledVoices, voiceModelPaths } from './manager';
import { useTtsStore } from './store';

/**
 * The real SpeechService (T11, design §6/§11): Piper via sherpa-onnx when
 * the selected voice is installed, transparent fallback to the Android
 * system TTS (expo-speech, `uk-UA`) otherwise — so speech-dependent UI
 * (word popup, readback) never hard-fails, with zero voices installed or
 * after any native error. UT05: a selection is a (voice, speaker) pair —
 * Piper archives may carry several speakers addressed by `sid`.
 */

export type { TtsEngine } from './engine';

export interface SpeakOutcome {
  engine: TtsEngine;
  /** Piper only: the speaker id that spoke. */
  sid?: number;
  /** Piper only: measured call→first-audio latency (design §6 budget). */
  firstAudioMs?: number;
}

/** Resolve which engine a speak call will actually use right now. */
export function resolveEngine(requestedVoiceId?: string): EngineChoice {
  const { selectedVoiceId, installed } = useTtsStore.getState();
  return pickEngine(requestedVoiceId, selectedVoiceId, Object.keys(installed));
}

async function ensureVoiceLoaded(voiceId: string): Promise<void> {
  const voice = getVoice(voiceId);
  if (!voice) throw new Error(`unknown voice: ${voiceId}`);
  const paths = voiceModelPaths(voice);
  const result = await SherpaSpeech.loadVoice(
    voiceId,
    paths.modelPath,
    paths.tokensPath,
    paths.dataDir,
  );
  if (!result.alreadyLoaded) {
    track('tts_voice_loaded', { voiceId, loadMs: result.loadMs });
  }
}

let systemSpeechGeneration = 0;

function speakSystem(text: string, rate: number): void {
  const generation = ++systemSpeechGeneration;
  const finish = () => {
    if (generation === systemSpeechGeneration) useTtsStore.getState().setSystemSpeaking(false);
  };
  Speech.stop();
  useTtsStore.getState().setSystemSpeaking(true);
  try {
    Speech.speak(text, {
      language: 'uk-UA',
      rate,
      onDone: finish,
      onStopped: finish,
      onError: finish,
    });
  } catch (error) {
    finish();
    throw error;
  }
}

/**
 * Speak and report which engine ran + measured latency (the dev screen
 * shows this; the acceptance criterion is recorded from it). Piper errors
 * degrade to the system voice instead of surfacing — design §11's safety
 * net stays live at every stage.
 */
export async function speakWithInfo(text: string, opts?: SpeakOptions): Promise<SpeakOutcome> {
  const rate = clampRate(opts?.rate);
  const { engine, voiceId } = resolveEngine(opts?.voiceId);

  if (engine === 'piper') {
    const { selectedVoiceId, selectedSid } = useTtsStore.getState();
    const sid = pickSpeaker(voiceId, opts?.sid, selectedVoiceId, selectedSid);
    try {
      await ensureVoiceLoaded(voiceId);
      const result = await SherpaSpeech.speak(text, sid, rate);
      track('tts_spoken', {
        engine: 'piper',
        voiceId,
        sid,
        chars: text.length,
        firstAudioMs: result.firstAudioMs ?? -1,
      });
      return { engine: 'piper', sid, firstAudioMs: result.firstAudioMs };
    } catch (err) {
      // A broken voice must never mute the app — fall through to system TTS.
      console.warn(`[tts] piper speak failed (${voiceId}), falling back to system`, err);
      track('tts_piper_fallback', {
        voiceId,
        message: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  speakSystem(text, rate);
  track('tts_spoken', { engine: 'system', chars: text.length });
  return { engine: 'system' };
}

export async function stopSpeaking(): Promise<void> {
  const generation = ++systemSpeechGeneration;
  SherpaSpeech.stop();
  await Speech.stop();
  if (generation === systemSpeechGeneration) useTtsStore.getState().setSystemSpeaking(false);
}

/**
 * Change the active voice + speaker (Settings). Persists + warm-loads
 * Piper voices. `sid` defaults to speaker 0 (every voice has one).
 */
export async function setSelectedVoice(voiceId: string, sid = 0): Promise<void> {
  const selection: TtsVoiceSelection = { selectedVoiceId: voiceId, selectedSid: sid };
  useTtsStore.getState().setSelectedVoice(voiceId, sid);
  await repos.settings.set(SETTING_KEYS.ttsVoice, toTtsVoiceSetting(selection));
  track('tts_voice_selected', { voiceId, sid });
  if (voiceId !== SYSTEM_VOICE_ID) {
    // Fire-and-forget preload so the first tap speaks inside the §6 budget.
    void ensureVoiceLoaded(voiceId).catch((err) =>
      console.warn(`[tts] preload of ${voiceId} failed`, err),
    );
  }
}

let listenerBound = false;

/**
 * Hydrate TTS state after the DB is ready (DbProvider): read + heal the
 * persisted selection, scan installed voices, register the real
 * SpeechService, and warm-load the selected Piper voice off the critical
 * path. From this moment the T05 word-popup speaker is live app-wide.
 */
export async function hydrateTtsFromDb(): Promise<void> {
  const installed = await refreshInstalledVoices();

  const stored = await repos.settings.get(SETTING_KEYS.ttsVoice);
  let { selectedVoiceId, selectedSid } = parseTtsVoiceSetting(stored);
  if (selectedVoiceId !== SYSTEM_VOICE_ID && !installed[selectedVoiceId]) {
    // Selected voice's files are gone (deleted externally / failed install):
    // heal the stored setting instead of silently misbehaving forever.
    selectedVoiceId = SYSTEM_VOICE_ID;
    selectedSid = 0;
    await repos.settings.set(SETTING_KEYS.ttsVoice, { selectedVoiceId });
  }
  useTtsStore.getState().setSelectedVoice(selectedVoiceId, selectedSid);

  if (!listenerBound) {
    listenerBound = true;
    SherpaSpeech.addListener('onSpeakingStateChanged', ({ speaking }) => {
      useTtsStore.getState().setSpeaking(speaking);
    });
  }

  setSpeechService({
    available: true,
    async speak(text, opts) {
      await speakWithInfo(text, opts);
    },
    stop: stopSpeaking,
  });

  if (selectedVoiceId !== SYSTEM_VOICE_ID) {
    void ensureVoiceLoaded(selectedVoiceId).catch((err) =>
      console.warn(`[tts] startup preload of ${selectedVoiceId} failed`, err),
    );
  }
}

export { isVoiceInstalled };
