import { normalizeScenarioText } from '@/db/normalize';
import { allowedEdits, charDistance, wordsMatch } from '@/features/pronunciation/scoring';

/** The scenario language the primitives run in. `ru` stays the default so Sumrak merges stay clean; Сутінки call sites pass `uk`. */
export type SlotLanguage = 'ru' | 'uk';

/**
 * Slot primitives for the scenario judge (T60, SPEAKING_SCENARIOS §5.1):
 * stopwords, Russian numerals, and the form matcher (exact forms via the
 * T12 tolerant `wordsMatch`; trailing-`*` stem globs compare the stem
 * against the token's prefix with the T12 `allowedEdits` budget applied
 * to the STEM, so «голава» still hits «голов*»). Pure — no React, no DB.
 *
 * Everything here runs over already-normalized scoring tokens
 * (`scoringTokens`: NFC, lowercase, ё→е, punctuation stripped).
 */

/**
 * Stopwords never satisfy a `free` slot's `minTokens` (§5.1 — the design's
 * list plus fillers, pronoun/possessive forms and the ASR's usual hesitation
 * noises). «из» is deliberately NOT here — it carries "from" (scripts §0).
 */
export const STOP_RU: ReadonlySet<string> = new Set(
  [
    // the §5.1 list
    'я',
    'ты',
    'мы',
    'и',
    'а',
    'но',
    'да',
    'нет',
    'ну',
    'вот',
    'это',
    'в',
    'на',
    'у',
    'с',
    'к',
    'о',
    'же',
    'ли',
    'не',
    'что',
    'как',
    'так',
    'там',
    'тут',
    'очень',
    'пожалуйста',
    'спасибо',
    // pronouns + possessives (they never carry the answer)
    'он',
    'она',
    'оно',
    'они',
    'вы',
    'меня',
    'мне',
    'мной',
    'тебя',
    'тебе',
    'вас',
    'вам',
    'нас',
    'нам',
    'его',
    'ему',
    'ее',
    'ей',
    'их',
    'им',
    'мой',
    'моя',
    'мое',
    'мои',
    'твой',
    'твоя',
    'твое',
    'твои',
    'наш',
    'наша',
    'наше',
    'наши',
    'ваш',
    'ваша',
    'ваше',
    'ваши',
    'себя',
    'себе',
    // particles / conjunctions / prepositions
    'то',
    'бы',
    'уже',
    'еще',
    'тоже',
    'также',
    'здесь',
    'за',
    'от',
    'до',
    'по',
    'для',
    'об',
    'обо',
    'из-за',
    'при',
    'без',
    'или',
    'если',
    'ведь',
    'даже',
    'просто',
    'вообще',
    'типа',
    'значит',
    // fillers and hesitation noises the ASR tends to emit
    'э',
    'э-э',
    'ээ',
    'эм',
    'м',
    'мм',
    'м-м',
    'хм',
    'ой',
    'ах',
    'ох',
    'ага',
    'угу',
    'ладно',
    'окей',
    'ок',
    'кстати',
  ].map((w) => normalizeScenarioText(w)),
);

/** Fillers that may precede a spoken command («пожалуйста, повтори», «ну, что значит…»). */
export const LEADING_FILLERS_RU: ReadonlySet<string> = new Set(
  [
    'ну',
    'а',
    'э',
    'э-э',
    'ээ',
    'эм',
    'вот',
    'пожалуйста',
    'извини',
    'извините',
    'простите',
    'ой',
    'так',
  ].map((w) => normalizeScenarioText(w)),
);

/**
 * Ukrainian stopwords (UT14, ticket decision 5): they never satisfy a `free`
 * slot's `minTokens` and may slip in a meta-intent trigger. Pronoun/
 * possessive forms, particles, prepositions, fillers and the ASR's
 * hesitation noises. «з/із/зі» are stopwords here (the ticket's list) — the
 * forms slots that need «з молоком» match them as forms, not as content.
 */
export const STOP_UK: ReadonlySet<string> = new Set(
  [
    'я',
    'ти',
    'він',
    'вона',
    'воно',
    'ми',
    'ви',
    'вони',
    'і',
    'й',
    'та',
    'а',
    'але',
    'в',
    'у',
    'на',
    'з',
    'із',
    'зі',
    'до',
    'від',
    'по',
    'за',
    'при',
    'це',
    'той',
    'ця',
    'цей',
    'що',
    'як',
    'так',
    'ні',
    'ну',
    'не',
    'ж',
    'же',
    'ось',
    'от',
    'мене',
    'мені',
    'мною',
    'тебе',
    'тобі',
    'тобою',
    'його',
    'йому',
    'її',
    'їй',
    'їх',
    'їм',
    'нас',
    'нам',
    'вас',
    'вам',
    'мій',
    'моя',
    'моє',
    'мої',
    'твій',
    'твоя',
    'твоє',
    'твої',
    'наш',
    'наша',
    'наше',
    'наші',
    'ваш',
    'ваша',
    'ваше',
    'ваші',
    'себе',
    'собі',
    'то',
    'би',
    'б',
    'вже',
    'уже',
    'ще',
    'теж',
    'також',
    'тут',
    'там',
    'дуже',
    'будь',
    'ласка',
    'дякую',
    'просто',
    'взагалі',
    'типу',
    'значить',
    'власне',
    'про',
    'для',
    'без',
    'або',
    'чи',
    'якщо',
    'е',
    'е-е',
    'ее',
    'ем',
    'м',
    'мм',
    'м-м',
    'хм',
    'ой',
    'ах',
    'ох',
    'ага',
    'угу',
    'гаразд',
    'окей',
    'ок',
  ].map((w) => normalizeScenarioText(w)),
);

/** Fillers that may precede a spoken command («будь ласка, повтори», «ну, що значить…»). */
export const LEADING_FILLERS_UK: ReadonlySet<string> = new Set(
  [
    'ну',
    'будь',
    'ласка',
    'вибачте',
    'вибач',
    'пробачте',
    'пробач',
    'е',
    'е-е',
    'ее',
    'ем',
    'ой',
  ].map((w) => normalizeScenarioText(w)),
);

export function stopwordsFor(language: SlotLanguage): ReadonlySet<string> {
  return language === 'uk' ? STOP_UK : STOP_RU;
}

export function leadingFillersFor(language: SlotLanguage): ReadonlySet<string> {
  return language === 'uk' ? LEADING_FILLERS_UK : LEADING_FILLERS_RU;
}

export function isStopword(token: string, language: SlotLanguage = 'ru'): boolean {
  return stopwordsFor(language).has(normalizeScenarioText(token));
}

/** A token that can satisfy a `free` slot: not a stopword (numerals and names count). */
export function isContentToken(token: string, language: SlotLanguage = 'ru'): boolean {
  return token.length > 0 && !isStopword(token, language);
}

export function contentTokens(tokens: readonly string[], language: SlotLanguage = 'ru'): string[] {
  return tokens.filter((t) => isContentToken(t, language));
}

/**
 * Russian numerals 1–100 (§5.1): nominative units/teens/tens/«сто» plus the
 * oblique forms the ASR hears in «… лет / года» phrases. Compounds are two
 * tokens («двадцать пять») — each is in the map, so `hasNumeral` and
 * `parseRuNumber` both see them. Digits (`/^\d+$/`) count too.
 */
export const RU_NUMERALS: ReadonlyMap<string, number> = new Map<string, number>(
  (
    [
      ['ноль', 0],
      ['один', 1],
      ['одна', 1],
      ['одно', 1],
      ['одного', 1],
      ['одной', 1],
      ['раз', 1],
      ['два', 2],
      ['две', 2],
      ['двух', 2],
      ['три', 3],
      ['трех', 3],
      ['трёх', 3],
      ['четыре', 4],
      ['четырех', 4],
      ['четырёх', 4],
      ['пять', 5],
      ['пяти', 5],
      ['шесть', 6],
      ['шести', 6],
      ['семь', 7],
      ['семи', 7],
      ['восемь', 8],
      ['восьми', 8],
      ['девять', 9],
      ['девяти', 9],
      ['десять', 10],
      ['десяти', 10],
      ['одиннадцать', 11],
      ['двенадцать', 12],
      ['тринадцать', 13],
      ['четырнадцать', 14],
      ['пятнадцать', 15],
      ['шестнадцать', 16],
      ['семнадцать', 17],
      ['восемнадцать', 18],
      ['девятнадцать', 19],
      ['двадцать', 20],
      ['двадцати', 20],
      ['тридцать', 30],
      ['тридцати', 30],
      ['сорок', 40],
      ['сорока', 40],
      ['пятьдесят', 50],
      ['пятидесяти', 50],
      ['шестьдесят', 60],
      ['шестидесяти', 60],
      ['семьдесят', 70],
      ['семидесяти', 70],
      ['восемьдесят', 80],
      ['восьмидесяти', 80],
      ['девяносто', 90],
      ['девяноста', 90],
      ['сто', 100],
      ['ста', 100],
    ] as [string, number][]
  ).map(([w, n]) => [normalizeScenarioText(w), n]),
);

/**
 * Ukrainian numerals 0–100 (UT14, ticket decision 5): cardinals with the
 * gender/oblique forms the ASR hears, plus the ordinals a pump/line number
 * is answered with («третя», «п'ята»). Keys are folded with the same
 * apostrophe fold as `scoringTokens` (U+02BC).
 */
export const UK_NUMERALS: ReadonlyMap<string, number> = new Map<string, number>(
  (
    [
      ['нуль', 0],
      ['нуля', 0],
      ['один', 1],
      ['одна', 1],
      ['одне', 1],
      ['одного', 1],
      ['одної', 1],
      ['одну', 1],
      ['два', 2],
      ['дві', 2],
      ['двох', 2],
      ['двоє', 2],
      ['три', 3],
      ['трьох', 3],
      ['троє', 3],
      ['чотири', 4],
      ['чотирьох', 4],
      ["п'ять", 5],
      ["п'яти", 5],
      ['шість', 6],
      ['шести', 6],
      ['сім', 7],
      ['семи', 7],
      ['вісім', 8],
      ['восьми', 8],
      ["дев'ять", 9],
      ["дев'яти", 9],
      ['десять', 10],
      ['десяти', 10],
      ['одинадцять', 11],
      ['дванадцять', 12],
      ['тринадцять', 13],
      ['чотирнадцять', 14],
      ["п'ятнадцять", 15],
      ['шістнадцять', 16],
      ['сімнадцять', 17],
      ['вісімнадцять', 18],
      ["дев'ятнадцять", 19],
      ['двадцять', 20],
      ['двадцяти', 20],
      ['тридцять', 30],
      ['тридцяти', 30],
      ['сорок', 40],
      ['сорока', 40],
      ["п'ятдесят", 50],
      ["п'ятдесяти", 50],
      ['шістдесят', 60],
      ['шістдесяти', 60],
      ['сімдесят', 70],
      ['сімдесяти', 70],
      ['вісімдесят', 80],
      ['вісімдесяти', 80],
      ["дев'яносто", 90],
      ["дев'яноста", 90],
      ['сто', 100],
      ['ста', 100],
      // ordinals (pump / line / floor numbers)
      ['перший', 1],
      ['перша', 1],
      ['перше', 1],
      ['другий', 2],
      ['друга', 2],
      ['друге', 2],
      ['третій', 3],
      ['третя', 3],
      ['третє', 3],
      ['четвертий', 4],
      ['четверта', 4],
      ['четверте', 4],
      ["п'ятий", 5],
      ["п'ята", 5],
      ["п'яте", 5],
      ['шостий', 6],
      ['шоста', 6],
      ['шосте', 6],
      ['сьомий', 7],
      ['сьома', 7],
      ['сьоме', 7],
      ['восьмий', 8],
      ['восьма', 8],
      ['восьме', 8],
      ["дев'ятий", 9],
      ["дев'ята", 9],
      ["дев'яте", 9],
      ['десятий', 10],
      ['десята', 10],
      ['десяте', 10],
    ] as [string, number][]
  ).map(([w, n]) => [normalizeScenarioText(w), n]),
);

const DIGITS = /^\d+$/;

function numeralsFor(language: SlotLanguage): ReadonlyMap<string, number> {
  return language === 'uk' ? UK_NUMERALS : RU_NUMERALS;
}

/** Exact (ё/е-folded) numeral word or a digit string — never edit-tolerant («путь» must not read as «пять»). */
export function isNumeralToken(token: string, language: SlotLanguage = 'ru'): boolean {
  const t = normalizeScenarioText(token);
  return DIGITS.test(t) || numeralsFor(language).has(t);
}

export function hasNumeral(tokens: readonly string[], language: SlotLanguage = 'ru'): boolean {
  return tokens.some((t) => isNumeralToken(t, language));
}

/**
 * The value of the first numeral run in the tokens («двадцать пять лет» →
 * 25, «сто» → 100, «7» → 7), null when none. Consecutive numeral words are
 * summed while each is smaller than the previous (tens + units); anything
 * else starts a new number. Informational — slots only need presence.
 */
export function parseRuNumber(
  tokens: readonly string[],
  language: SlotLanguage = 'ru',
): number | null {
  const table = numeralsFor(language);
  let i = 0;
  while (i < tokens.length && !isNumeralToken(tokens[i]!, language)) i++;
  if (i >= tokens.length) return null;
  const first = normalizeScenarioText(tokens[i]!);
  if (DIGITS.test(first)) return Number.parseInt(first, 10);
  let total = table.get(first)!;
  let prev = total;
  for (let j = i + 1; j < tokens.length; j++) {
    const t = normalizeScenarioText(tokens[j]!);
    const v = table.get(t);
    if (v === undefined || DIGITS.test(t) || v >= prev || v === 0) break;
    total += v;
    prev = v;
  }
  return total;
}

/** Ukrainian alias of {@link parseRuNumber} («двадцять п'ять» → 25). */
export function parseUkNumber(tokens: readonly string[]): number | null {
  return parseRuNumber(tokens, 'uk');
}

// --- form matching ---------------------------------------------------------

/**
 * Ukrainian consonant alternations at a stem's edge (UT14, ticket decision 5):
 * the stem «рук» meets «руці», «ног» meets «нозі», «мух» meets «мусі»…
 * Symmetric — an author may write the alternated stem too. Each entry maps a
 * final stem letter(s) to the letter(s) it can become before і/е/ь/ою.
 */
const UK_ALTERNATIONS: readonly (readonly [string, readonly string[]])[] = [
  ['г', ['з', 'ж']],
  ['з', ['г', 'ж']],
  ['к', ['ц', 'ч']],
  ['ц', ['к']],
  ['ч', ['к', 'т']],
  ['х', ['с', 'ш']],
  ['с', ['х']],
  ['ш', ['х']],
  ['ж', ['г', 'з']],
  ['д', ['дж', 'дз']],
  ['т', ['ч']],
];

/** The stem plus its alternation variants (final letter swapped); only for stems of ≥ 3 letters. */
export function stemVariantsUk(stem: string): string[] {
  const out = [stem];
  if (stem.length < 3) return out;
  const head = stem.slice(0, -1);
  const last = stem.slice(-1);
  for (const [from, tos] of UK_ALTERNATIONS) {
    if (last === from) for (const to of tos) out.push(head + to);
  }
  // multi-letter source: «дж» → д, «дз» → д
  if (stem.endsWith('дж') || stem.endsWith('дз')) out.push(stem.slice(0, -2) + 'д');
  return out;
}

/** A stem glob («голов*») compared against the token's prefix with the stem's edit budget. */
export function stemMatches(stem: string, token: string, language: SlotLanguage = 'ru'): boolean {
  if (stem.length === 0) return false;
  if (language === 'uk') {
    const variants = stemVariantsUk(stem);
    if (variants.slice(1).some((v) => token.startsWith(v))) return true;
  }
  return stemMatchesExact(stem, token);
}

function stemMatchesExact(stem: string, token: string): boolean {
  if (token.startsWith(stem)) return true;
  const budget = allowedEdits(stem.length);
  if (budget === 0) return false;
  // The token may be shorter than the stem by up to the budget («чит» vs «чита*»).
  if (token.length < stem.length - budget) return false;
  const prefix = token.slice(0, stem.length);
  return charDistance(stem, prefix) <= budget;
}

const NEGATION_PREFIX = 'не';

/**
 * Words that START with «не» but are lexical, not a negated base (UT14,
 * ticket decision 4): «небо», «неділя», «нехай», «нести»… Never treated as
 * «не» + remainder, so no authored form can be shadowed by them.
 */
export const UK_NEGATION_LEXICAL: ReadonlySet<string> = new Set(
  [
    'небо',
    'небеса',
    'неділя',
    'неділю',
    'неділі',
    'нехай',
    'нести',
    'несу',
    'несе',
    'несуть',
    'нервовий',
    'нерви',
    'немовля',
    'ненька',
    'невістка',
    'нею',
    'неї',
    'нещодавно',
  ].map((w) => normalizeScenarioText(w)),
);

/**
 * The T12 edit budget was tuned for ASR misspellings, but two edits also
 * cover the negation prefix: «плохо» sits inside «неплохо»'s budget and
 * «давно» inside «недавно»'s — a wrong BRANCH, not a tolerance. When exactly
 * one side carries a leading «не» and the remainders match, the words are
 * opposites, never the same word. (Recorded T60 decision; Ukrainian adds the
 * lexical-«не» guard list and the same rule for «недавно»/«давно».)
 */
export function negationMismatch(a: string, b: string, language: SlotLanguage = 'ru'): boolean {
  const lexical = (w: string) => language === 'uk' && UK_NEGATION_LEXICAL.has(w);
  const na = a.startsWith(NEGATION_PREFIX) && a.length > 4 && !lexical(a);
  const nb = b.startsWith(NEGATION_PREFIX) && b.length > 4 && !lexical(b);
  if (na === nb) return false;
  const ra = na ? a.slice(NEGATION_PREFIX.length) : a;
  const rb = nb ? b.slice(NEGATION_PREFIX.length) : b;
  return (
    ra === rb ||
    wordsMatch(ra, rb) ||
    (ra.length >= 3 && rb.startsWith(ra)) ||
    (rb.length >= 3 && ra.startsWith(rb))
  );
}

/** One authored form word (normalized) against one scoring token. */
export function formWordMatches(
  formWord: string,
  token: string,
  language: SlotLanguage = 'ru',
): boolean {
  if (formWord.endsWith('*')) {
    const stem = formWord.slice(0, -1);
    return stemMatches(stem, token, language) && !negationMismatch(stem, token, language);
  }
  return wordsMatch(formWord, token) && !negationMismatch(formWord, token, language);
}

export interface FormHit {
  /** Index of the first token the form covered. */
  at: number;
  /** How many tokens the form spans (multi-word forms like «не очень»). */
  span: number;
  /** The form as authored (ё preserved). */
  form: string;
}

/**
 * Does an authored form (possibly multi-word, a trailing `*` on any word
 * making it a stem glob) occur as a consecutive run inside the tokens?
 * Returns the first hit, or null.
 */
export function matchForm(
  form: string,
  tokens: readonly string[],
  language: SlotLanguage = 'ru',
): FormHit | null {
  const words = normalizeScenarioText(form)
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}*-]+|[^\p{L}\p{N}*-]+$/gu, ''))
    .filter((w) => w.length > 0);
  if (words.length === 0) return null;
  for (let at = 0; at + words.length <= tokens.length; at++) {
    let ok = true;
    for (let k = 0; k < words.length; k++) {
      if (!formWordMatches(words[k]!, tokens[at + k]!, language)) {
        ok = false;
        break;
      }
    }
    if (ok) return { at, span: words.length, form };
  }
  return null;
}

/**
 * Ranking of two hits: the longer token span wins («не люблю» beats «люблю»
 * — the longer authored form is the more specific claim); a tie keeps the
 * incumbent, i.e. the earlier form / earlier option. Authoring convention
 * (scripts file): catch-all options («elsewhere = из», «working = работаю»)
 * are listed LAST, so option order is the authors' priority signal.
 */
export function betterHit(candidate: FormHit, incumbent: FormHit | null): boolean {
  if (!incumbent) return true;
  return candidate.span > incumbent.span;
}

/**
 * Negative lead words of a Ukrainian form («ні», «не люблю», «нема», «нікого»…).
 * A form whose first word is one of these (or a «не»-prefixed non-lexical word)
 * is an explicit negation.
 */
const UK_NEGATIVE_LEADS: ReadonlySet<string> = new Set(
  ['ні', 'не', 'нема', 'немає', 'нікого', 'ніхто', 'нічого', 'ніколи', 'ніде', 'нікуди'].map((w) =>
    normalizeScenarioText(w),
  ),
);

/** Is this authored form an explicit negation («ні», «не потрібна», «немає»)? */
export function isNegativeForm(form: string): boolean {
  const first = normalizeScenarioText(form).split(/\s+/)[0]?.replace(/\*$/, '') ?? '';
  if (UK_NEGATIVE_LEADS.has(first)) return true;
  return first.startsWith(NEGATION_PREFIX) && first.length > 4 && !UK_NEGATION_LEXICAL.has(first);
}

/**
 * Is the hit a bare positive that the transcript negates — the particle «не»
 * stands right before it («не хочу» read against a bare `хочу`)? Such a hit
 * yields to every other hit of the slot (but still stands when it is the only one).
 */
export function isNegationGoverned(
  hit: FormHit,
  tokens: readonly string[],
  language: SlotLanguage,
): boolean {
  if (language !== 'uk') return false;
  if (isNegativeForm(hit.form)) return false;
  return hit.at > 0 && normalizeScenarioText(tokens[hit.at - 1]!) === NEGATION_PREFIX;
}

/**
 * The slot-level tie-break (UT14, USRC005/006 convention; Session log
 * 2026-11-05): **negation first, then option order**. For Ukrainian a hit
 * ranks by (1) not negation-governed, (2) an explicit negative form («ні»,
 * «не люблю») beats a bare positive token, (3) the longer span, (4) the
 * earlier option (the incumbent keeps a full tie). `ru` keeps T60's
 * span-then-order rule untouched.
 */
export function betterOptionHit(
  candidate: FormHit,
  incumbent: FormHit | null,
  tokens: readonly string[],
  language: SlotLanguage,
): boolean {
  if (!incumbent) return true;
  if (language !== 'uk') return betterHit(candidate, incumbent);
  const gc = isNegationGoverned(candidate, tokens, language);
  const gi = isNegationGoverned(incumbent, tokens, language);
  if (gc !== gi) return gi;
  const nc = isNegativeForm(candidate.form);
  const ni = isNegativeForm(incumbent.form);
  if (nc !== ni) return nc;
  return candidate.span > incumbent.span;
}

/** The best hit among several forms (see `betterHit`). Null when none hits. */
export function matchForms(
  forms: readonly string[],
  tokens: readonly string[],
  language: SlotLanguage = 'ru',
): FormHit | null {
  let best: FormHit | null = null;
  for (const form of forms) {
    const hit = matchForm(form, tokens, language);
    if (hit && betterOptionHit(hit, best, tokens, language)) best = hit;
  }
  return best;
}

/** Index set of the tokens a set of forms covers (used to mask reject words out of `free` counting). */
export function coveredTokenIndexes(
  forms: readonly string[],
  tokens: readonly string[],
  language: SlotLanguage = 'ru',
): Set<number> {
  const covered = new Set<number>();
  for (const form of forms) {
    const hit = matchForm(form, tokens, language);
    if (!hit) continue;
    for (let i = 0; i < hit.span; i++) covered.add(hit.at + i);
  }
  return covered;
}
