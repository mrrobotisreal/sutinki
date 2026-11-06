import { pluralUk } from '@/lib/uk-plural';

/** Ukrainian plural: 1 частина · 2–4 частини · 5+ частин (11–14 → частин). */
export function partsLabel(n: number): string {
  return `${n} ${pluralUk(n, ['частина', 'частини', 'частин'])}`;
}

/** Minutes rounded; below 60 s → «< 1 хв». */
export function minutesLabel(ms: number): string {
  if (ms < 60_000) return '< 1 хв';
  return `${Math.round(ms / 60_000)} хв`;
}

/** «elevenlabs:Mr. Wintrow» → «Mr. Wintrow». */
export function voiceLabel(voice: string): string {
  return voice.replace(/^[^:]+:/, '');
}

/** «8 частин · 17 хв · Mr. Wintrow» (voice omitted when empty). */
export function listenCaption(a: { parts: number; durationMs: number; voice: string }): string {
  const voice = voiceLabel(a.voice);
  return [partsLabel(a.parts), minutesLabel(a.durationMs), voice].filter(Boolean).join(' · ');
}
