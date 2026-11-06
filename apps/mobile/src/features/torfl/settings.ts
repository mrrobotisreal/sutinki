import { repos } from '@/db';
import { SETTING_KEYS } from '@/db/repositories/settings';
import { getGrammarPreset, type AiRunProfile } from '@/features/ai/run-profile';

import { EXAM_LEVELS, UKR_PROFILES, isTorflLevel, type TorflLevel } from './level-profile';
import {
  DEFAULT_EXAM_GRADING_PRESET,
  parseExamDate,
  parseTorflPrefs,
  sanitizeExamGradingPreset,
  type TorflPrefs,
} from './settings-core';

/**
 * The «ТРКИ» settings accessors (T68, TORFL §4.4) — the one read/write path
 * over `torfl.prefs` / `torfl.examDate` / `torfl.gradingPreset`. Every read
 * is healed through `settings-core`; T69 (hub, countdown), T70 (drill
 * timer), T71 (break screen, lookup rule) and T72 (grading) consume these.
 */

export async function getTorflPrefs(): Promise<TorflPrefs> {
  return parseTorflPrefs(await repos.settings.get<unknown>(SETTING_KEYS.torflPrefs));
}

export async function setTorflPrefs(patch: Partial<Omit<TorflPrefs, 'v'>>): Promise<TorflPrefs> {
  const next = parseTorflPrefs({ ...(await getTorflPrefs()), ...patch });
  await repos.settings.set(SETTING_KEYS.torflPrefs, next);
  return next;
}

/** The exam date of one level (A1 = `torfl.examDate`, A2 = `torfl.examDateA2`, B1/B2/C1 = `torfl.examDateB1|B2|C1`). */
export async function getExamDate(level: TorflLevel = 'A1'): Promise<string | null> {
  return parseExamDate(await repos.settings.get<unknown>(UKR_PROFILES[level].examDateKey));
}

/**
 * Set (valid 'YYYY-MM-DD') or clear (null) one level's exam date; an invalid
 * date throws.
 */
export async function setExamDate(date: string | null, level: TorflLevel = 'A1'): Promise<void> {
  const key = UKR_PROFILES[level].examDateKey;
  if (date === null) {
    await repos.settings.remove(key);
    return;
  }
  const clean = parseExamDate(date);
  if (clean === null) throw new Error(`invalid exam date "${date}"`);
  await repos.settings.set(key, clean);
}

/** Every level's exam date, each healed on its own key. */
export async function getExamDates(): Promise<Record<TorflLevel, string | null>> {
  const out = {} as Record<TorflLevel, string | null>;
  for (const level of EXAM_LEVELS) out[level] = await getExamDate(level);
  return out;
}

/** The last-used hub level (`torfl.level`), healed: anything unknown → null. */
export async function getStoredLevel(): Promise<TorflLevel | null> {
  const raw = await repos.settings.get<unknown>(SETTING_KEYS.torflLevel);
  return isTorflLevel(raw) ? raw : null;
}

export async function setStoredLevel(level: TorflLevel): Promise<void> {
  await repos.settings.set(SETTING_KEYS.torflLevel, level);
}

/** The default triple: provider follows the grammar preset; quality normal; effort high. */
async function gradingFallback(): Promise<AiRunProfile> {
  const grammar = await getGrammarPreset();
  return { ...DEFAULT_EXAM_GRADING_PRESET, provider: grammar.provider };
}

export async function getExamGradingPreset(): Promise<AiRunProfile> {
  const stored = await repos.settings.get<unknown>(SETTING_KEYS.torflGradingPreset);
  const fallback = await gradingFallback();
  return stored == null ? fallback : sanitizeExamGradingPreset(stored, fallback);
}

export async function setExamGradingPreset(profile: AiRunProfile): Promise<void> {
  const clean = sanitizeExamGradingPreset(profile, await gradingFallback());
  await repos.settings.set(SETTING_KEYS.torflGradingPreset, { v: 1, ...clean });
}
