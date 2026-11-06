/**
 * Ukrainian number rendering (T34, V2 §7.5; Sutinki UP06) — pure, table-driven, no Intl.
 * The numbers drill speaks what these functions return: Piper is never
 * handed a digit string (its digit reading is unreliable — recorded T34
 * principle), so every word the learner hears is built here.
 *
 * CONVENTIONS (recorded in the UP06 ticket):
 * - Cardinals 0 … 999 999 999; the drill uses 0 … 1 000 000.
 * - A LEADING group whose count is exactly 1 drops «один/одна»: 1 000 =
 *   «тисяча», 1 500 = «тисяча п'ятсот», 1 000 000 = «мільйон» — but 21 000 =
 *   «двадцять одна тисяча» and 2 001 001 = «два мільйони одна тисяча один»
 *   (mid-number the 1 is said and agrees).
 * - Gender agreement on 1 and 2 only (один/одна/одне, два/дві); the thousands
 *   group is always feminine («дві тисячі»), millions masculine («два мільйони»).
 * - Plural form choice ({@link pluralForm}, one implementation shared with
 *   `pluralUk`): n mod 100 in 11–14 → many; else n mod 10 = 1 → one, 2–4 → few,
 *   otherwise many.
 * - Apostrophe: every internal string carries U+02BC (ʼ), the canonical form
 *   `normalizeUk` folds to; {@link toSpeech} maps it to what Piper pronounces.
 * - Prices: hryvnia only — «N гривень M копійок» (both feminine); kopecks 0 are
 *   omitted, hryvnias 0 with kopecks reads kopecks only.
 * - Clock: two styles, 24-hour. `digital` is a DRILL CONVENTION (unambiguous,
 *   pairs with the typed `h:mm` answer): the hour is the FEMININE NOMINATIVE
 *   ORDINAL (agrees with the implicit «година») and the minutes the feminine
 *   cardinal (implicit «хвилина») — 14:30 «чотирнадцята тридцять», 9:05
 *   «дев'ята нуль п'ять», 7:00 «сьома нуль-нуль», 0:15 «нульова п'ятнадцять».
 *   `full` = «чотирнадцята година тридцять хвилин»; 00 minutes reads the hour
 *   only. Colloquial «за п'ять п'ята» / «пів на другу» are out of scope.
 * - Dates: neuter ordinal day + genitive month — «п'яте березня».
 * - Years: masculine nominative ordinal + «рік» — «тисяча дев'ятсот вісімдесят
 *   сьомий рік», «двотисячний рік».
 * - Ages: «N рік/роки/років» — «двадцять один рік», «двадцять два роки».
 * Every returned string is NFC.
 */
import { pluralUk } from '@/lib/uk-plural';

export type Gender = 'm' | 'f' | 'n';

const A = 'ʼ'; // U+02BC

const UNITS_M = [
  'нуль',
  'один',
  'два',
  'три',
  'чотири',
  `п${A}ять`,
  'шість',
  'сім',
  'вісім',
  `дев${A}ять`,
] as const;

const TEENS = [
  'десять',
  'одинадцять',
  'дванадцять',
  'тринадцять',
  'чотирнадцять',
  `п${A}ятнадцять`,
  'шістнадцять',
  'сімнадцять',
  'вісімнадцять',
  `дев${A}ятнадцять`,
] as const;

const TENS = [
  '',
  '',
  'двадцять',
  'тридцять',
  'сорок',
  `п${A}ятдесят`,
  'шістдесят',
  'сімдесят',
  'вісімдесят',
  `дев${A}яносто`,
] as const;

const HUNDREDS = [
  '',
  'сто',
  'двісті',
  'триста',
  'чотириста',
  `п${A}ятсот`,
  'шістсот',
  'сімсот',
  'вісімсот',
  `дев${A}ятсот`,
] as const;

/** Masculine nominative ordinals 1–19 (index = number). */
const ORD_UNITS = [
  '',
  'перший',
  'другий',
  'третій',
  'четвертий',
  `п${A}ятий`,
  'шостий',
  'сьомий',
  'восьмий',
  `дев${A}ятий`,
  'десятий',
  'одинадцятий',
  'дванадцятий',
  'тринадцятий',
  'чотирнадцятий',
  `п${A}ятнадцятий`,
  'шістнадцятий',
  'сімнадцятий',
  'вісімнадцятий',
  `дев${A}ятнадцятий`,
] as const;

const ORD_TENS = [
  '',
  '',
  'двадцятий',
  'тридцятий',
  'сороковий',
  `п${A}ятдесятий`,
  'шістдесятий',
  'сімдесятий',
  'вісімдесятий',
  `дев${A}яностий`,
] as const;

const ORD_HUNDREDS = [
  '',
  'сотий',
  'двохсотий',
  'трьохсотий',
  'чотирьохсотий',
  `п${A}ятисотий`,
  'шестисотий',
  'семисотий',
  'восьмисотий',
  `дев${A}ятисотий`,
] as const;

/** Compound prefixes for round-thousand ordinals («двотисячний»). */
const ORD_THOUSAND_PREFIX = [
  '',
  '',
  'дво',
  'три',
  'чотири',
  `п${A}яти`,
  'шести',
  'семи',
  'восьми',
  `дев${A}яти`,
] as const;

/** Genitive month names (dates: «п'яте березня»). Index 0 = January. */
export const UK_MONTHS_GENITIVE = [
  'січня',
  'лютого',
  'березня',
  'квітня',
  'травня',
  'червня',
  'липня',
  'серпня',
  'вересня',
  'жовтня',
  'листопада',
  'грудня',
] as const;

export const MAX_CARDINAL = 999_999_999;

function nfc(s: string): string {
  return s.normalize('NFC');
}

/**
 * What Piper is handed: the internal U+02BC apostrophe mapped to the form the
 * voices pronounce cleanly (decided on the S25, UP06 Decision 5). Digits never
 * reach this function.
 */
export function toSpeech(text: string): string {
  return text.replaceAll(A, "'");
}

function assertInt(n: number, min: number, max: number, what: string): void {
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new RangeError(`${what}: ${n} is not an integer in ${min}…${max}`);
  }
}

/**
 * The 1 / 2–4 / 5+ form choice with the 11–14 exception — the single
 * implementation lives in `uk-plural.ts`; this is its generic-free alias for
 * the numerals: pluralForm(21, ['рік','роки','років']) → 'рік'.
 */
export const pluralForm = pluralUk;

/** 1 and 2 agree with the counted noun; every other unit is gender-neutral. */
function unitWord(u: number, gender: Gender): string {
  if (u === 1) return gender === 'f' ? 'одна' : gender === 'n' ? 'одне' : 'один';
  if (u === 2) return gender === 'f' ? 'дві' : 'два';
  return UNITS_M[u]!;
}

/** Words for 1–999 (never 0), agreeing in gender. */
function triadWords(n: number, gender: Gender): string[] {
  const words: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0) words.push(HUNDREDS[h]!);
  if (rest >= 10 && rest <= 19) {
    words.push(TEENS[rest - 10]!);
  } else {
    const t = Math.floor(rest / 10);
    const u = rest % 10;
    if (t > 0) words.push(TENS[t]!);
    if (u > 0) words.push(unitWord(u, gender));
  }
  return words;
}

/**
 * Integer → Ukrainian cardinal words. `gender` agrees the final 1/2 with the
 * counted noun (default masculine): cardinal(21, 'f') → «двадцять одна».
 * Neuter 2 is «два» (два вікна); feminine «дві».
 */
export function cardinal(n: number, gender: Gender = 'm'): string {
  assertInt(n, 0, MAX_CARDINAL, 'cardinal');
  if (n === 0) return 'нуль';
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const units = n % 1000;
  const words: string[] = [];
  if (millions > 0) {
    if (millions !== 1) words.push(...triadWords(millions, 'm'));
    words.push(pluralForm(millions, ['мільйон', 'мільйони', 'мільйонів']));
  }
  if (thousands > 0) {
    // «одна» is dropped only when the thousands group leads the number.
    if (thousands !== 1 || millions > 0) words.push(...triadWords(thousands, 'f'));
    words.push(pluralForm(thousands, ['тисяча', 'тисячі', 'тисяч']));
  }
  if (units > 0) words.push(...triadWords(units, gender));
  return nfc(words.join(' '));
}

/** Masculine nominative ordinal for 1 … 999 999 (only the last word inflects). */
function ordinalMasc(n: number): string {
  assertInt(n, 1, 999_999, 'ordinal');
  if (n % 1000 === 0) {
    const k = n / 1000;
    if (k === 1) return 'тисячний';
    if (k < 10) return `${ORD_THOUSAND_PREFIX[k]}тисячний`;
    // Rare compounds («двадцятитисячний») — not needed by any drill tier.
    throw new RangeError(`ordinal: round thousands above 9000 unsupported (${n})`);
  }
  const lastTwo = n % 100;
  if (lastTwo !== 0) {
    const prefix = n - lastTwo > 0 ? `${cardinal(n - lastTwo)} ` : '';
    let tail: string;
    if (lastTwo < 20) tail = ORD_UNITS[lastTwo]!;
    else if (lastTwo % 10 === 0) tail = ORD_TENS[lastTwo / 10]!;
    else tail = `${TENS[Math.floor(lastTwo / 10)]} ${ORD_UNITS[lastTwo % 10]}`;
    return prefix + tail;
  }
  // Ends in a round hundred: 1900 → «тисяча дев'ятисотий».
  const hundreds = (n % 1000) / 100;
  const prefix = n - (n % 1000) > 0 ? `${cardinal(n - (n % 1000))} ` : '';
  return prefix + ORD_HUNDREDS[hundreds]!;
}

/** Re-ends the last word of a masculine ordinal for the gender/case asked. */
function reEndOrdinal(masc: string, ending: 'n' | 'f' | 'gen'): string {
  const cut = masc.lastIndexOf(' ');
  const head = cut >= 0 ? masc.slice(0, cut + 1) : '';
  const last = cut >= 0 ? masc.slice(cut + 1) : masc;
  const stem = last.slice(0, -2);
  // «третій» is the one soft-stem ordinal.
  if (last.endsWith('ій')) {
    return head + stem + (ending === 'n' ? 'є' : ending === 'f' ? 'я' : 'ього');
  }
  return head + stem + (ending === 'n' ? 'е' : ending === 'f' ? 'а' : 'ого');
}

/** Nominative ordinal in a gender: ordinal(5, 'n') → «п'яте». */
export function ordinal(n: number, gender: Gender = 'm'): string {
  const masc = ordinalMasc(n);
  return nfc(gender === 'm' ? masc : reEndOrdinal(masc, gender));
}

/** Masculine/neuter genitive ordinal: ordinalGenitive(1987) → «… вісімдесят сьомого». */
export function ordinalGenitive(n: number): string {
  return nfc(reEndOrdinal(ordinalMasc(n), 'gen'));
}

/** Hryvnia only (UP06 Decision 1) — kept as a type so call sites stay explicit. */
export type Currency = 'uah';

const CURRENCY: Record<Currency, { gender: Gender; forms: readonly [string, string, string] }> = {
  uah: { gender: 'f', forms: ['гривня', 'гривні', 'гривень'] },
};

const KOPECK_FORMS = ['копійка', 'копійки', 'копійок'] as const;

/** «N <noun>» with gender agreement and the plural form — the building block. */
export function countNoun(
  n: number,
  gender: Gender,
  forms: readonly [string, string, string],
): string {
  return nfc(`${cardinal(n, gender)} ${pluralForm(n, forms)}`);
}

/**
 * A price: formatPrice(125) → «сто двадцять п'ять гривень»;
 * formatPrice(12, 50) → «дванадцять гривень п'ятдесят копійок»;
 * formatPrice(0, 1) → «одна копійка»; formatPrice(2) → «дві гривні».
 */
export function formatPrice(whole: number, kopecks = 0, currency: Currency = 'uah'): string {
  assertInt(whole, 0, MAX_CARDINAL, 'price');
  assertInt(kopecks, 0, 99, 'kopecks');
  const { gender, forms } = CURRENCY[currency];
  const parts: string[] = [];
  if (whole > 0 || kopecks === 0) parts.push(countNoun(whole, gender, forms));
  if (kopecks > 0) parts.push(countNoun(kopecks, 'f', KOPECK_FORMS));
  return nfc(parts.join(' '));
}

export type ClockStyle = 'digital' | 'full';

/** The hour as a feminine nominative ordinal (agrees with «година»); 0 → «нульова». */
function hourOrdinal(hours: number): string {
  return hours === 0 ? 'нульова' : ordinal(hours, 'f');
}

/**
 * A clock time, 24-hour. digital: formatClock(14, 30) → «чотирнадцята
 * тридцять», (9, 5) → «дев'ята нуль п'ять», (7, 0) → «сьома нуль-нуль»;
 * full: (14, 30) → «чотирнадцята година тридцять хвилин», (1, 21) → «перша
 * година двадцять одна хвилина», (22, 0) → «двадцять друга година».
 */
export function formatClock(hours: number, minutes: number, style: ClockStyle = 'digital'): string {
  assertInt(hours, 0, 23, 'hours');
  assertInt(minutes, 0, 59, 'minutes');
  if (style === 'full') {
    const h = `${hourOrdinal(hours)} година`;
    if (minutes === 0) return nfc(h);
    return nfc(`${h} ${countNoun(minutes, 'f', ['хвилина', 'хвилини', 'хвилин'])}`);
  }
  const h = hourOrdinal(hours);
  let m: string;
  if (minutes === 0) m = 'нуль-нуль';
  else if (minutes < 10) m = `нуль ${cardinal(minutes, 'f')}`;
  else m = cardinal(minutes, 'f');
  return nfc(`${h} ${m}`);
}

/** Days in a month, for validation (leap-year Feb = 29; no year context). */
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** A date: formatDate(5, 3) → «п'яте березня» (month 1–12). */
export function formatDate(day: number, month: number): string {
  assertInt(month, 1, 12, 'month');
  assertInt(day, 1, MONTH_DAYS[month - 1]!, 'day');
  return nfc(`${ordinal(day, 'n')} ${UK_MONTHS_GENITIVE[month - 1]}`);
}

/** A year as said on its own: formatYear(1987) → «тисяча дев'ятсот вісімдесят сьомий рік». */
export function formatYear(year: number): string {
  assertInt(year, 1, 9999, 'year');
  return nfc(`${ordinal(year)} рік`);
}

/** An age: formatAge(21) → «двадцять один рік», (3) → «три роки», (11) → «одинадцять років». */
export function formatAge(years: number): string {
  assertInt(years, 0, 150, 'age');
  return countNoun(years, 'm', ['рік', 'роки', 'років']);
}
