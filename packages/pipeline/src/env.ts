import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Minimal env loading for the pipeline's online steps (T09).
 *
 * The ElevenLabs key is environment-only by policy (workspace CLAUDE.md): it
 * must never be committed, logged, or printed. Besides the process
 * environment, we accept a gitignored `.env` / `.env.local` at the repo root
 * so the key never has to live in a shell profile. Values are returned to the
 * caller and NEVER logged here.
 */

const ENV_FILES = ['.env.local', '.env'];

/** Parse simple KEY=VALUE lines (no export, no multiline, # comments). */
function parseEnvFile(content: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out.set(key, value);
  }
  return out;
}

/**
 * Resolve one env var: process env first, then `.env.local` / `.env` at
 * `rootDir` (the repo root when run via `pnpm pipeline`). Returns undefined
 * when absent everywhere.
 */
export function resolveEnvVar(name: string, rootDir: string = process.cwd()): string | undefined {
  const fromProcess = process.env[name];
  if (fromProcess !== undefined && fromProcess !== '') return fromProcess;
  for (const file of ENV_FILES) {
    const path = join(rootDir, file);
    if (!existsSync(path)) continue;
    const value = parseEnvFile(readFileSync(path, 'utf8')).get(name);
    if (value !== undefined && value !== '') return value;
  }
  return undefined;
}

export interface ElevenKey {
  /** Which variable supplied the key. */
  name: 'ELEVENLABS_API_KEY_2' | 'ELEVENLABS_API_KEY';
  /** The secret itself — pass straight to the client, never log or print. */
  value: string;
}

/**
 * Sutinki renders on the dedicated account (ADR-0012): `ELEVENLABS_API_KEY_2`
 * wins; the plain `ELEVENLABS_API_KEY` is only a fallback (the caller warns).
 * `env` is the test seam: when given, only that object is consulted (no `.env`
 * file is read); when omitted, process env then `.env.local` / `.env`.
 */
export function resolveElevenKey(
  rootDir: string = process.cwd(),
  env?: Record<string, string | undefined>,
): ElevenKey | undefined {
  const lookup = (name: string): string | undefined => {
    if (env === undefined) return resolveEnvVar(name, rootDir);
    const v = env[name];
    return v !== undefined && v !== '' ? v : undefined;
  };
  const primary = lookup('ELEVENLABS_API_KEY_2');
  if (primary !== undefined) return { name: 'ELEVENLABS_API_KEY_2', value: primary };
  const fallback = lookup('ELEVENLABS_API_KEY');
  if (fallback !== undefined) return { name: 'ELEVENLABS_API_KEY', value: fallback };
  return undefined;
}
