/**
 * Ukrainian apostrophe hygiene (UT02, ADR-0004). Three apostrophe code points
 * appear in the wild — U+0027 `'`, U+2019 `’`, U+02BC `ʼ` — plus two keyboard
 * look-alikes (U+0060 `` ` `` and U+00B4 `´`). The pipeline never rewrites
 * stored text (the sources use U+0027 and the app's `normalizeUk` folds at
 * the matching layer), but it does keep drafts honest:
 *
 * - a `UK:` line that mixes apostrophe code points inside ONE sentence is a
 *   warning (it renders fine, but bank dedup and search hinge on the fold);
 * - a token `text` whose apostrophe differs from the sentence's is an error —
 *   alignment would fail anyway, and the message names the real cause.
 */

/** Every code point the pipeline treats as "an apostrophe". */
export const APOSTROPHE_CODE_POINTS: readonly string[] = ["'", '’', 'ʼ', '`', '´'];

const APOSTROPHE_RE = /['’ʼ`´]/gu;

/** Human label for one apostrophe code point, e.g. `U+2019 ’`. */
export function describeApostrophe(ch: string): string {
  const cp = ch.codePointAt(0) ?? 0;
  return `U+${cp.toString(16).toUpperCase().padStart(4, '0')} ${ch}`;
}

/** The distinct apostrophe code points used in `text`, in first-seen order. */
export function apostrophesIn(text: string): string[] {
  const seen: string[] = [];
  for (const m of text.matchAll(APOSTROPHE_RE)) {
    if (!seen.includes(m[0])) seen.push(m[0]);
  }
  return seen;
}

/** `text` with every apostrophe variant folded to U+0027 (comparison only — never stored). */
export function foldApostrophes(text: string): string {
  return text.replace(APOSTROPHE_RE, "'");
}
