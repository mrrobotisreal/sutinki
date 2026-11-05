/**
 * EN → Cyrillic transliteration (T56, SPEAKING_SCENARIOS §2.3 / §3, ADR-0019
 * decision 4): how the Russian zipformer ASR *tends to hear* an English word
 * spoken inside «Как сказать <english>?». Deterministic, data-driven, and
 * heuristic by design — it produces CANDIDATES, not truth. Where English
 * spelling is ambiguous a rule yields several alternatives and the product of
 * alternatives is enumerated (primary-first, capped), so a glossary entry's
 * `translit` list covers the likely garbles; the draft's hand-written extras
 * are merged on top (see {@link mergeTranslit}) and never fight the table.
 *
 * The T59 benchmark refines the table from real device recordings (scripts
 * file Appendix B note) — keep every rule here as data, never as code paths.
 *
 * UT14: two tables, selected by {@link translitFor}. `ru` is Sumrak's (the
 * Russian zipformer); `uk` is `TRANSLIT_RULES_UK` — how the NeMo Ukrainian
 * transducer tends to write English heard inside «Як сказати X?». No output
 * of the `uk` table ever contains ы э ё ъ (test-enforced).
 */

/** One rule: an English grapheme sequence → one or more Cyrillic renderings (primary first). */
export interface TranslitRule {
  /** Lowercase English graphemes, matched longest-first at the current position. */
  from: string;
  /** Cyrillic alternatives; the first is the primary rendering. */
  to: readonly string[];
  /** Positional constraint. */
  where?: 'initial' | 'final';
}

/** Emitted-candidate cap per word (the product of alternatives can explode). */
export const TRANSLIT_MAX_CANDIDATES = 16;

/** The language a translit table is tuned for (scenario `language`). */
export type TranslitLanguage = 'ru' | 'uk';

/**
 * UT14: the Ukrainian table (ticket decision 1). Conventions: `h` → г first /
 * х second; `w` → в, у; `th` → т, з, с, ф; `sh` → ш; `ch` → ч; `j`/soft `g` →
 * дж; `ee`/`ea` → і; `oo` → у; `ou`/`ow` → ау, оу; final `y` → і/ай; `a` →
 * е/а/ей; `ph` → ф; `x` → кс; `qu` → кв; `ng` → нг; `tion` → шн, шен;
 * doubled letters collapse. Calibrated against NeMo-uk transcripts of
 * English words (a macOS-voice PROXY for Mitch's speech — see the UT14
 * Session log); the model also writes English through its Russian side, so
 * the table keeps the Ukrainian-letter twin of every Russian garble.
 */
export const TRANSLIT_RULES_UK: readonly TranslitRule[] = [
  // --- specific spellings ------------------------------------------------
  { from: 'ceipt', to: ['сіт', 'сит'] },
  { from: 'ation', to: ['ейшн', 'ешн', 'ашн'] },
  { from: 'wich', to: ['віч', 'ч'] },
  { from: 'ow', to: ['оу', 'ау', 'о'], where: 'final' },
  { from: 'tion', to: ['шн', 'шен'] },
  { from: 'sion', to: ['жн', 'шн'] },
  { from: 'ange', to: ['ейндж', 'ендж'] },
  { from: 'are', to: ['ер', 'еа'], where: 'final' },
  { from: 'ire', to: ['айр', 'айер'], where: 'final' },
  { from: 'ore', to: ['ор'], where: 'final' },
  { from: 'ure', to: ['юр', 'ур'], where: 'final' },
  { from: 'ough', to: ['о', 'ау', 'аф'] },
  { from: 'igh', to: ['ай'] },
  { from: 'dge', to: ['дж'] },
  { from: 'tch', to: ['ч', 'тч'] },
  { from: 'gue', to: ['ге'] },
  // --- consonant digraphs ------------------------------------------------
  { from: 'th', to: ['т', 'з', 'с', 'ф'] },
  { from: 'sh', to: ['ш', 'щ'] },
  { from: 'ch', to: ['ч', 'к'] },
  { from: 'ph', to: ['ф'] },
  { from: 'wh', to: ['в', 'у'] },
  { from: 'ck', to: ['к'] },
  { from: 'qu', to: ['кв'] },
  { from: 'kn', to: ['н'], where: 'initial' },
  { from: 'wr', to: ['р'], where: 'initial' },
  { from: 'ng', to: ['нг'], where: 'final' },
  { from: 'gh', to: ['г'] },
  // doubled consonants: single by default, doubled as an alternative where the ASR keeps it
  { from: 'll', to: ['л', 'лл'] },
  { from: 'ss', to: ['с', 'сс'] },
  { from: 'cc', to: ['к', 'кк'] },
  { from: 'tt', to: ['т', 'тт'] },
  { from: 'pp', to: ['п'] },
  { from: 'nn', to: ['н'] },
  { from: 'mm', to: ['м'] },
  { from: 'rr', to: ['р'] },
  { from: 'ff', to: ['ф'] },
  { from: 'gg', to: ['г'] },
  { from: 'dd', to: ['д'] },
  { from: 'bb', to: ['б'] },
  { from: 'zz', to: ['з'] },
  // --- vowel digraphs ----------------------------------------------------
  { from: 'oo', to: ['у'] },
  { from: 'ee', to: ['і', 'и'] },
  { from: 'ea', to: ['і', 'е', 'и'] },
  { from: 'ie', to: ['і', 'и'] },
  { from: 'ei', to: ['і', 'ей'] },
  { from: 'ou', to: ['ау', 'оу'] },
  { from: 'ow', to: ['ау', 'оу'] },
  { from: 'ay', to: ['ей'] },
  { from: 'ai', to: ['ей'] },
  { from: 'oi', to: ['ой'] },
  { from: 'oy', to: ['ой'] },
  { from: 'oa', to: ['оу', 'о'] },
  { from: 'aw', to: ['о'] },
  { from: 'au', to: ['о'] },
  { from: 'ew', to: ['ю'] },
  { from: 'eu', to: ['ю'] },
  { from: 'ue', to: ['у'], where: 'final' },
  // --- r-colored vowels --------------------------------------------------
  { from: 'ur', to: ['ер', 'ор', 'ур'] },
  { from: 'ir', to: ['ер', 'ір'] },
  { from: 'er', to: ['ер', 'а'], where: 'final' },
  { from: 'or', to: ['ор'] },
  { from: 'ar', to: ['ар'] },
];

const LETTERS_UK: Readonly<Record<string, readonly string[]>> = {
  a: ['а', 'е'],
  b: ['б'],
  d: ['д'],
  f: ['ф'],
  h: ['г', 'х'],
  i: ['і', 'и', 'ай', 'е'],
  j: ['дж'],
  k: ['к'],
  l: ['л'],
  m: ['м'],
  n: ['н'],
  o: ['о', 'а'],
  p: ['п'],
  q: ['к'],
  r: ['р'],
  t: ['т'],
  u: ['у', 'а'],
  v: ['в'],
  w: ['в', 'у'],
  x: ['кс'],
  z: ['з'],
};

const MAGIC_E_UK: Readonly<Record<string, readonly string[]>> = {
  a: ['ей', 'ей'],
  i: ['ай', 'і'],
  o: ['оу', 'о'],
  u: ['ю', 'у'],
  e: ['і', 'е'],
  y: ['ай'],
};

/** Context-sensitive letter renderings of one table (c, g, s, e, y). */
interface LetterContext {
  soft: boolean;
  betweenVowels: boolean;
  finalAfterVowel: boolean;
  initial: boolean;
  last: boolean;
}

interface TranslitTable {
  rules: readonly TranslitRule[];
  sorted: readonly TranslitRule[];
  letters: Readonly<Record<string, readonly string[]>>;
  magicE: Readonly<Record<string, readonly string[]>>;
  context: (ch: string, c: LetterContext) => readonly string[] | undefined;
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

/**
 * Multi-letter rules, longest-first within the table's scan (the matcher
 * sorts by `from.length` descending, table order breaks ties). Specific
 * exceptions («ceipt», «ange») sit here as data, exactly like digraphs.
 */
export const TRANSLIT_RULES: readonly TranslitRule[] = [
  // --- specific spellings ------------------------------------------------
  { from: 'ceipt', to: ['сит'] },
  { from: 'tion', to: ['шн', 'шен'] },
  { from: 'sion', to: ['жн', 'шн'] },
  { from: 'ange', to: ['эйндж', 'ейндж'] },
  { from: 'are', to: ['эр', 'еа'], where: 'final' },
  { from: 'ire', to: ['айр', 'айер'], where: 'final' },
  { from: 'ore', to: ['ор'], where: 'final' },
  { from: 'ure', to: ['юр', 'ур'], where: 'final' },
  { from: 'ough', to: ['о', 'ау', 'аф'] },
  { from: 'igh', to: ['ай'] },
  { from: 'dge', to: ['дж'] },
  { from: 'tch', to: ['ч', 'тч'] },
  { from: 'gue', to: ['ге'] },
  // --- consonant digraphs ------------------------------------------------
  { from: 'th', to: ['т', 'с', 'ф', 'з'] },
  { from: 'sh', to: ['ш'] },
  { from: 'ch', to: ['ч', 'к'] },
  { from: 'ph', to: ['ф'] },
  { from: 'wh', to: ['у', 'в'] },
  { from: 'ck', to: ['к'] },
  { from: 'qu', to: ['кв'] },
  { from: 'kn', to: ['н'], where: 'initial' },
  { from: 'wr', to: ['р'], where: 'initial' },
  { from: 'ng', to: ['нг'], where: 'final' },
  { from: 'gh', to: ['г'] },
  // doubled consonants: single by default (Russian hears one), doubled as an alternative
  { from: 'll', to: ['л', 'лл'] },
  { from: 'ss', to: ['с', 'сс'] },
  { from: 'cc', to: ['к', 'кк'] },
  { from: 'tt', to: ['т', 'тт'] },
  { from: 'pp', to: ['п'] },
  { from: 'nn', to: ['н'] },
  { from: 'mm', to: ['м'] },
  { from: 'rr', to: ['р'] },
  { from: 'ff', to: ['ф'] },
  { from: 'gg', to: ['г'] },
  { from: 'dd', to: ['д'] },
  { from: 'bb', to: ['б'] },
  { from: 'zz', to: ['з'] },
  // --- vowel digraphs ----------------------------------------------------
  { from: 'oo', to: ['у'] },
  { from: 'ee', to: ['и'] },
  { from: 'ea', to: ['и', 'э', 'е'] },
  { from: 'ie', to: ['и'] },
  { from: 'ei', to: ['и', 'эй'] },
  { from: 'ou', to: ['ау'] },
  { from: 'ow', to: ['ау', 'оу'] },
  { from: 'ay', to: ['эй'] },
  { from: 'ai', to: ['эй'] },
  { from: 'oi', to: ['ой'] },
  { from: 'oy', to: ['ой'] },
  { from: 'oa', to: ['оу', 'о'] },
  { from: 'aw', to: ['о'] },
  { from: 'au', to: ['о'] },
  { from: 'ew', to: ['ю'] },
  { from: 'eu', to: ['ю'] },
  { from: 'ue', to: ['у'], where: 'final' },
  // --- r-colored vowels --------------------------------------------------
  { from: 'ur', to: ['ёр', 'ор', 'ур'] },
  { from: 'ir', to: ['ёр', 'ир'] },
  { from: 'er', to: ['ер', 'а'], where: 'final' },
  { from: 'or', to: ['ор'] },
  { from: 'ar', to: ['ар'] },
];

/** Single letters. Context-sensitive ones (c, g, s, e, y) are resolved in {@link letterAlternatives}. */
const LETTERS: Readonly<Record<string, readonly string[]>> = {
  a: ['а', 'э'],
  b: ['б'],
  d: ['д'],
  f: ['ф'],
  h: ['х'],
  i: ['и', 'ай'],
  j: ['дж'],
  k: ['к'],
  l: ['л'],
  m: ['м'],
  n: ['н'],
  o: ['о', 'а'],
  p: ['п'],
  q: ['к'],
  r: ['р'],
  t: ['т'],
  u: ['у', 'а'],
  v: ['в'],
  w: ['у', 'в'],
  x: ['кс'],
  z: ['з'],
};

/** Long-vowel renderings for the «magic e» pattern V + C + e (primary first). */
const MAGIC_E: Readonly<Record<string, readonly string[]>> = {
  a: ['эй', 'ей'],
  i: ['ай', 'и'],
  o: ['о', 'оу'],
  u: ['ю', 'у'],
  e: ['и', 'е'],
  y: ['ай'],
};

/** Suffixes after which a «magic e» stays silent («basement», «lately», «hopeless»). */
const SILENT_E_SUFFIXES = ['ment', 'ly', 'less', 'ness', 'ful', 's', 'd'];

/** Consonant digraphs that count as ONE consonant inside the magic-e pattern. */
const MAGIC_E_CONSONANTS = [
  'ch',
  'sh',
  'th',
  'ph',
  'c',
  'd',
  'g',
  'k',
  'l',
  'm',
  'n',
  'p',
  'r',
  's',
  't',
  'v',
  'z',
  'b',
  'f',
];

const RU_TABLE: TranslitTable = {
  rules: TRANSLIT_RULES,
  sorted: [...TRANSLIT_RULES].sort((a, b) => b.from.length - a.from.length),
  letters: LETTERS,
  magicE: MAGIC_E,
  context: (ch, c) => {
    switch (ch) {
      case 'c':
        return c.soft ? ['с'] : ['к'];
      case 'g':
        return c.soft ? ['дж', 'г'] : ['г'];
      case 's':
        if (c.betweenVowels) return ['з', 'с'];
        return c.finalAfterVowel ? ['с', 'з'] : ['с'];
      case 'e':
        if (c.last) return ['']; // silent final e
        return c.initial ? ['э', 'и'] : ['е', 'и'];
      case 'y':
        return c.initial ? ['й'] : ['и'];
      default:
        return undefined;
    }
  },
};

const UK_TABLE: TranslitTable = {
  rules: TRANSLIT_RULES_UK,
  sorted: [...TRANSLIT_RULES_UK].sort((a, b) => b.from.length - a.from.length),
  letters: LETTERS_UK,
  magicE: MAGIC_E_UK,
  context: (ch, c) => {
    switch (ch) {
      case 'c':
        return c.soft ? ['с'] : ['к'];
      case 'g':
        return c.soft ? ['дж', 'г'] : ['г'];
      case 's':
        if (c.betweenVowels) return ['з', 'с'];
        return c.finalAfterVowel ? ['с', 'з'] : ['с'];
      case 'e':
        if (c.last) return ['']; // silent final e
        return c.initial ? ['е', 'і'] : ['е', 'і', 'и'];
      case 'y':
        // final y: «ці» / «ай» (happy → хепі, my → май); initial: й; inner: і, и
        if (c.initial) return ['й'];
        return c.last ? ['і', 'ай'] : ['і', 'и'];
      default:
        return undefined;
    }
  },
};

function letterAlternatives(t: TranslitTable, word: string, i: number): readonly string[] {
  const ch = word[i]!;
  const prev = word[i - 1];
  const next = word[i + 1];
  const ctx: LetterContext = {
    soft: next !== undefined && (next === 'e' || next === 'i' || next === 'y'),
    betweenVowels: prev !== undefined && VOWELS.has(prev) && next !== undefined && VOWELS.has(next),
    finalAfterVowel: next === undefined && prev !== undefined && VOWELS.has(prev),
    initial: i === 0,
    last: next === undefined,
  };
  return t.context(ch, ctx) ?? t.letters[ch] ?? [];
}

/** Match the «magic e» pattern at `i`: vowel + one consonant (or digraph) + e, where that e is silent. */
function magicE(
  t: TranslitTable,
  word: string,
  i: number,
): { alternatives: string[]; length: number } | null {
  const v = word[i]!;
  const vowelAlts = t.magicE[v];
  if (vowelAlts === undefined) return null;
  for (const c of MAGIC_E_CONSONANTS) {
    if (!word.startsWith(c, i + 1)) continue;
    const eAt = i + 1 + c.length;
    if (word[eAt] !== 'e') continue;
    // The e must be silent: word-final («police», «tire») or followed by a
    // suffix («basement», «lately»); otherwise it is pronounced («hotel», «fever»).
    const rest = word.slice(eAt + 1);
    if (rest !== '' && !SILENT_E_SUFFIXES.some((suf) => rest === suf)) continue;
    // Resolve the consonant IN CONTEXT (so «c» before this e is soft: police → полис).
    const inner = translitAt(t, word, i + 1);
    if (inner === null || inner.length !== c.length) continue;
    const alternatives = vowelAlts.flatMap((va) => inner.alternatives.map((ca) => va + ca));
    return { alternatives, length: c.length + 2 };
  }
  return null;
}

/** The rule (or letter) matching at position `i` of `word`. `end` bounds the scan (for digraph lookups). */
function translitAt(
  t: TranslitTable,
  word: string,
  i: number,
  end = word.length,
): { alternatives: readonly string[]; length: number } | null {
  for (const rule of t.sorted) {
    if (i + rule.from.length > end) continue;
    if (!word.startsWith(rule.from, i)) continue;
    if (rule.where === 'initial' && i !== 0) continue;
    if (rule.where === 'final' && i + rule.from.length !== end) continue;
    return { alternatives: rule.to, length: rule.from.length };
  }
  const single = letterAlternatives(t, word, i);
  return single.length > 0 ? { alternatives: single, length: 1 } : null;
}

/**
 * Transliterate ONE lowercase ASCII word into its candidate set (primary
 * candidate first, ≤ {@link TRANSLIT_MAX_CANDIDATES}, deduped, NFC).
 */
function transliterateWord(t: TranslitTable, word: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const walk = (i: number, acc: string): void => {
    if (out.length >= TRANSLIT_MAX_CANDIDATES) return;
    if (i >= word.length) {
      const c = acc.normalize('NFC');
      if (c !== '' && !seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
      return;
    }
    // Digraph/specific rules win over the magic-e pattern (e.g. «ange», «ire»),
    // and the pattern wins over the bare vowel letter.
    const rule = translitAt(t, word, i);
    const magic = rule !== null && rule.length > 1 ? null : magicE(t, word, i);
    const step = magic ?? rule;
    if (step === null) {
      walk(i + 1, acc); // unknown character: skipped
      return;
    }
    for (const alt of step.alternatives) walk(i + step.length, acc + alt);
  };
  walk(0, '');
  return out;
}

/**
 * Transliterate an English word or short phrase («gas station») into Cyrillic
 * candidates as the RU ASR tends to emit them. Case-insensitive; anything
 * that is not a letter or a space is dropped. Multi-word input yields the
 * space-joined product of per-word candidates (primary-first, capped).
 */
export function transliterate(en: string, language: TranslitLanguage = 'ru'): string[] {
  const table = language === 'uk' ? UK_TABLE : RU_TABLE;
  const words = en
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w !== '');
  if (words.length === 0) return [];
  let acc: string[] = [''];
  for (const word of words) {
    const cands = transliterateWord(table, word);
    if (cands.length === 0) continue;
    const next: string[] = [];
    for (const a of acc) {
      for (const c of cands) {
        if (next.length >= TRANSLIT_MAX_CANDIDATES) break;
        next.push(a === '' ? c : `${a} ${c}`);
      }
    }
    acc = next;
  }
  return acc.filter((c) => c !== '');
}

/** UT14: the transliterator for a scenario's language (`scenario.language`) — `uk` runs {@link TRANSLIT_RULES_UK}. */
export function translitFor(language: TranslitLanguage): (en: string) => string[] {
  return (en) => transliterate(en, language);
}

/** The Russian-only letters no `uk` candidate may contain (ticket decision 1). */
export const RUSSIAN_ONLY_LETTERS = /[ыэёъ]/u;

/**
 * The glossary entry's final `translit` list: the draft's hand-written extras
 * FIRST (an author override is the best guess), then the generated
 * candidates, deduped after NFC + lowercase.
 */
export function mergeTranslit(generated: readonly string[], extras: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...extras, ...generated]) {
    const c = raw.normalize('NFC').trim().toLowerCase();
    if (c === '' || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}
