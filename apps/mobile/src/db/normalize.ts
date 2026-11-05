/**
 * Ukrainian text normalization for matching/search (roadmap §3, ADR-0004:
 * stored text is never mutated — the author's apostrophe and ґ are preserved
 * in content and user tables; tolerance lives here, at the matching layer).
 */

/**
 * Every apostrophe code point seen in Ukrainian text in the wild:
 * U+0027 ' (ASCII, what the sources use), U+2019 ’ (typographic), U+02BC ʼ
 * (modifier letter — the "correct" one), U+0060 ` and U+00B4 ´ (keyboards).
 */
export const APOSTROPHE_CHARS = "'’ʼ`´";
const APOSTROPHES = new RegExp(`[${APOSTROPHE_CHARS}]`, 'g');

/**
 * Word splitter for RAW (not yet normalized) text: every apostrophe variant
 * is in-word, exactly as it is after folding. Use this wherever display
 * tokens must stay index-aligned with normalized scoring tokens.
 */
export const RAW_WORD_SPLIT = new RegExp(`[^\\p{L}\\p{N}${APOSTROPHE_CHARS}-]+`, 'u');

/**
 * The canonical apostrophe after folding: U+02BC MODIFIER LETTER APOSTROPHE.
 * It is a *letter* (Unicode category Lm), so FTS5's `unicode61` tokenizer
 * and `\p{L}` regexes keep «пʼять» one token — U+0027 is punctuation (Po)
 * and would split the word. ADR-0004 chose it for exactly that reason.
 */
export const FOLDED_APOSTROPHE = 'ʼ';

/**
 * NFC + lowercase + apostrophe fold (→ U+02BC) + ґ→г fold. The canonical
 * "tolerant match" form of a word. і/ї/є/и are distinct letters and are
 * never folded.
 */
export function normalizeUk(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(APOSTROPHES, FOLDED_APOSTROPHE)
    .replaceAll('ґ', 'г');
}

/** Phrase key: normalizeUk + whitespace collapse + trim (bank phrase dedup, design §5). */
export function normalizePhrase(text: string): string {
  return normalizeUk(text).replace(/\s+/g, ' ').trim();
}

/**
 * Turn raw user input into a safe FTS5 MATCH expression: normalize, split on
 * non-word characters (the folded apostrophe is a letter, so «п'ять» stays
 * one term), quote every term (so FTS operators/quotes in input can't break
 * the query), prefix-match the last term for as-you-type search.
 * Returns null when the input has no searchable content.
 */
export function toFtsQuery(raw: string): string | null {
  const terms = normalizeUk(raw)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0);
  if (terms.length === 0) return null;
  return terms.map((t, i) => (i === terms.length - 1 ? `"${t}"*` : `"${t}"`)).join(' ');
}

/**
 * Scenario-engine fold (UP03): `normalizeUk` plus ё→е. The M17 judge, meta
 * intents and glossary lookup are still the Russian engine (UT14 ports them);
 * their tables are ё/е-folded. ё never occurs in Ukrainian, so the superset is
 * harmless for the Ukrainian engine UT14 will land.
 */
export function normalizeScenarioText(text: string): string {
  return normalizeUk(text).replaceAll('ё', 'е');
}
