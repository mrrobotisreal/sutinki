import type { BankItemRow } from '@/db/repositories/bank';
import type { ProfileKind } from '@/db/schema/user';

import { STRESS, type ProfileLanguage, type ProfilePos, type WordProfile } from './profile-schema';

/**
 * Pure word-profile core (M16/T52, WORD_FORMS §5.2–§5.4): the section
 * catalog, the structural validator that runs AFTER the Zod parse, the
 * prompt renderer for the catalog, and the profile-key helper. No DB, no
 * network, no React — unit-tested exhaustively.
 *
 * The catalog is the single source of truth: the validator's fixed labels
 * and the prompt's FIXED lines both come from `SECTION_CATALOG`, so the
 * prompt and the validator can never disagree (ticket technical note).
 */

// --- §5.3 fixed labels -------------------------------------------------------

/** Case row labels (★ fixed, verbatim). `uk` has seven cases incl. the vocative (UT13, AUTHORING canon). */
export const CASES: Record<ProfileLanguage, readonly string[]> = {
  ru: [
    'Nom. — именительный',
    'Gen. — родительный',
    'Dat. — дательный',
    'Acc. — винительный',
    'Ins. — творительный',
    'Prep. — предложный',
  ],
  uk: [
    'Nom. — називний',
    'Gen. — родовий',
    'Dat. — давальний',
    'Acc. — знахідний',
    'Instr. — орудний',
    'Loc. — місцевий',
    'Voc. — кличний',
  ],
};
/** Person rows ★ (Russian; kept for upstream tests — Ukrainian is `PERSONS_UK`). */
export const PERSONS: readonly string[] = ['я', 'ты', 'он / она / оно', 'мы', 'вы', 'они'];
/** Gender rows ★ (Russian; Ukrainian is `GENDERS_UK`). */
export const GENDERS: readonly string[] = ['masc. (он)', 'fem. (она)', 'neut. (оно)', 'pl. (они)'];
/** Ukrainian person rows ★ (ти, not ты). */
export const PERSONS_UK: readonly string[] = ['я', 'ти', 'він / вона / воно', 'ми', 'ви', 'вони'];
/** Ukrainian gender rows ★. */
export const GENDERS_UK: readonly string[] = [
  'masc. (він)',
  'fem. (вона)',
  'neut. (воно)',
  'pl. (вони)',
];

// --- §5.3 the catalog --------------------------------------------------------

export interface CatalogEntry {
  id: string;
  title: { en: string; ru: string };
  layout: 'grid' | 'list';
  /**
   * Fixed row labels (★): a literal list, or `'cases'` = `CASES[language]`.
   * Absent for list sections and for grids whose rows are free.
   */
  fixedRows?: readonly string[] | 'cases';
  /** Column labels for grids; absent = chosen by the model (≥ 1). */
  colLabels?: readonly string[];
  /** POS values for which the section MUST be present (§5.2 rule 3). */
  requiredFor: readonly ProfilePos[];
  /** Content rule shown to the model, from §5.3. */
  rule: string;
}

const DECLENSION_FREE_COLS =
  'cols chosen by the model (≥ 1); recommended, not enforced — indeclinables legitimately omit it: indeclinable → no section + an overview note saying so';

export const SECTION_CATALOG: readonly CatalogEntry[] = [
  {
    id: 'verb-nonpast',
    title: { en: 'Present & future', ru: 'Настоящее и будущее' },
    layout: 'grid',
    fixedRows: PERSONS,
    colLabels: ['Present', 'Future'],
    requiredFor: ['verb'],
    rule: 'imperfective: present forms + compound future («бу́ду говори́ть»); perfective: Present column all null + note "perfective verbs have no present", Future = simple future',
  },
  {
    id: 'verb-past',
    title: { en: 'Past & conditional', ru: 'Прошедшее и условное' },
    layout: 'grid',
    fixedRows: GENDERS,
    colLabels: ['Past', 'Conditional (бы)'],
    requiredFor: ['verb'],
    rule: '',
  },
  {
    id: 'verb-imperative',
    title: { en: 'Imperative', ru: 'Повелительное' },
    layout: 'grid',
    fixedRows: ['ты', 'вы'],
    colLabels: ['Imperative'],
    requiredFor: ['verb'],
    rule: 'note on aspect choice in commands/prohibitions',
  },
  {
    id: 'verb-participles',
    title: { en: 'Participles', ru: 'Причастия' },
    layout: 'grid',
    fixedRows: [
      'Present active',
      'Past active',
      'Present passive',
      'Past passive',
      'Past passive short (m / f / n / pl)',
    ],
    colLabels: ['Form'],
    requiredFor: ['verb'],
    rule: 'non-existent → null + note (e.g. intransitive ⇒ no passives)',
  },
  {
    id: 'verb-gerunds',
    title: { en: 'Verbal adverbs', ru: 'Деепричастия' },
    layout: 'list',
    requiredFor: ['verb'],
    rule: 'rows: present gerund, past gerund(s); gloss "while …ing" / "having …ed"',
  },
  {
    id: 'verb-family',
    title: { en: 'Aspect pair & word family', ru: 'Видовая пара и семья слова' },
    layout: 'list',
    requiredFor: ['verb'],
    rule: '≤ 14 rows total (validator-enforced); row 1 = aspect partner (tags ["partner", "pf"|"impf"]), then prefixed/derived verbs by frequency (tags ["pf"|"impf", "prefix:по-"]), reflexive counterparts (["refl"]), then nouns/adjectives/adverbs from the root (["noun"] …); every row has a gloss with the nuance ("to have a talk (completed)")',
  },
  {
    id: 'verb-government',
    title: { en: 'Government & collocations', ru: 'Управление и сочетаемость' },
    layout: 'list',
    requiredFor: ['verb'],
    rule: 'rows = pattern in Cyrillic only (ru «говори́ть с кем-либо», gloss "to talk with someone — с + instr.") + example',
  },
  {
    id: 'noun-declension',
    title: { en: 'Declension', ru: 'Склонение' },
    layout: 'grid',
    fixedRows: 'cases',
    colLabels: ['Singular', 'Plural'],
    requiredFor: ['noun'],
    rule: 'singularia/pluralia tantum → whole column null + note; animate accusative shown as is',
  },
  {
    id: 'noun-family',
    title: { en: 'Word family', ru: 'Семья слова' },
    layout: 'list',
    requiredFor: ['noun'],
    rule: 'diminutive/augmentative, adjective(s), verb(s), person nouns; tags ["dim"] ["aug"] ["adj"] ["verb"]',
  },
  {
    id: 'noun-collocations',
    title: { en: 'Collocations & usage', ru: 'Сочетаемость' },
    layout: 'list',
    requiredFor: [],
    rule: 'pattern + gloss + example',
  },
  {
    id: 'adj-long',
    title: { en: 'Long-form declension', ru: 'Полная форма' },
    layout: 'grid',
    fixedRows: 'cases',
    colLabels: ['Masc.', 'Fem.', 'Neut.', 'Plural'],
    requiredFor: ['adj'],
    rule: 'animate/inanimate accusative as «но́вый / но́вого» in one cell + note',
  },
  {
    id: 'adj-short',
    title: { en: 'Short forms', ru: 'Краткие формы' },
    layout: 'list',
    requiredFor: ['adj'],
    rule: 'rows m/f/n/pl; null-equivalent = omit the section + explain in overview.notes when the adjective has none',
  },
  {
    id: 'adj-comparison',
    title: { en: 'Comparative & superlative', ru: 'Степени сравнения' },
    layout: 'list',
    requiredFor: ['adj'],
    rule: 'simple + compound comparative, simple + compound superlative',
  },
  {
    id: 'adj-adverb',
    title: { en: 'Adverb', ru: 'Наречие' },
    layout: 'list',
    requiredFor: [],
    rule: '',
  },
  {
    id: 'adj-family',
    title: { en: 'Word family', ru: 'Семья слова' },
    layout: 'list',
    requiredFor: [],
    rule: '',
  },
  {
    id: 'pron-declension',
    title: { en: 'Declension', ru: 'Склонение' },
    layout: 'grid',
    fixedRows: 'cases',
    requiredFor: [],
    rule: `pron: ${DECLENSION_FREE_COLS}`,
  },
  {
    id: 'num-declension',
    title: { en: 'Declension', ru: 'Склонение' },
    layout: 'grid',
    fixedRows: 'cases',
    requiredFor: [],
    rule: `num: ${DECLENSION_FREE_COLS}`,
  },
  {
    id: 'name-declension',
    title: { en: 'Declension', ru: 'Склонение' },
    layout: 'grid',
    fixedRows: 'cases',
    requiredFor: [],
    rule: `name: ${DECLENSION_FREE_COLS}`,
  },
  {
    id: 'usage',
    title: { en: 'Usage & patterns', ru: 'Употребление' },
    layout: 'list',
    requiredFor: ['adv', 'prep', 'conj', 'part', 'other'],
    rule: 'meanings, patterns, register, example each (any POS may add it)',
  },
  {
    id: 'related',
    title: { en: 'Related forms', ru: 'Родственные формы' },
    layout: 'list',
    requiredFor: [],
    rule: '',
  },
  {
    id: 'phrase-structure',
    title: { en: 'Word by word', ru: 'Разбор по словам' },
    layout: 'list',
    requiredFor: ['phrase'],
    rule: 'one row per word: ru stressed, gloss = the form («gen. pl. of во́лос»), note = meaning here',
  },
  {
    id: 'phrase-usage',
    title: { en: 'Usage & register', ru: 'Употребление и стиль' },
    layout: 'list',
    requiredFor: ['phrase'],
    rule: 'situations, register, ≥ 2 examples via example',
  },
  {
    id: 'phrase-variants',
    title: { en: 'Variants & synonyms', ru: 'Варианты и синонимы' },
    layout: 'list',
    requiredFor: [],
    rule: 'variants, near-synonyms, antonyms',
  },
];

// --- UT13: the Ukrainian catalog (same 23 ids and order; Ukrainian labels, rules and required sets) ---

export const SECTION_CATALOG_UK: readonly CatalogEntry[] = [
  {
    id: 'verb-nonpast',
    title: { en: 'Present & future', ru: 'Теперішній і майбутній час' },
    layout: 'grid',
    fixedRows: PERSONS_UK,
    colLabels: ['Present', 'Future'],
    requiredFor: ['verb'],
    rule: 'imperfective: present forms (first conjugation -еш/-єш/-уть·-ють, second -иш/-їш/-ать·-ять; give the consonant alternation of "я" such as «хо́дити → хо́джу») + compound future («бу́ду чита́ти»); perfective: Present column all null + note "perfective verbs have no present", Future = simple future («зроблю́»)',
  },
  {
    id: 'verb-past',
    title: { en: 'Past & conditional', ru: 'Минулий і умовний час' },
    layout: 'grid',
    fixedRows: GENDERS_UK,
    colLabels: ['Past', 'Conditional (б / би)'],
    requiredFor: ['verb'],
    rule: 'past = stem + -в / -ла / -ло / -ли (masc. ends in -в, not -л: «чита́в»); conditional = past + "б" after a vowel, "би" after a consonant («чита́в би», «чита́ла б»); note irregular or fleeting stems («міг, могла́»)',
  },
  {
    id: 'verb-imperative',
    title: { en: 'Imperative', ru: 'Наказовий спосіб' },
    layout: 'grid',
    fixedRows: ['ти', 'ви'],
    colLabels: ['Imperative'],
    requiredFor: ['verb'],
    rule: 'ти / ви forms («чита́й / чита́йте»); put the inclusive «ми» form («чита́ймо», «ході́мо» / «дава́й» + inf.) in the section note; note on aspect choice: the negative imperative prefers the imperfective («не бери́», not «не візьми́»)',
  },
  {
    id: 'verb-participles',
    title: { en: 'Participles', ru: 'Дієприкметники' },
    layout: 'grid',
    fixedRows: ['Active present', 'Active past', 'Passive (-ний / -тий)'],
    colLabels: ['Form'],
    requiredFor: [],
    rule: 'OPTIONAL and bookish — include only forms you are certain exist and are attested (null + note otherwise; intransitive ⇒ no passives); omit the section entirely if unsure',
  },
  {
    id: 'verb-gerunds',
    title: { en: 'Verbal adverbs', ru: 'Дієприслівники' },
    layout: 'list',
    requiredFor: [],
    rule: 'OPTIONAL: rows: present (-учи / -ючи / -ачи / -ячи, imperfective only), past (-ши / -вши, perfective only); gloss "while …ing" / "having …ed"; omit the section if unsure',
  },
  {
    id: 'verb-family',
    title: { en: 'Aspect pair & word family', ru: 'Вид і родина слова' },
    layout: 'list',
    requiredFor: ['verb'],
    rule: '≤ 14 rows total (validator-enforced); row 1 = aspect partner (tags ["partner", "pf"|"impf"]); for a MOTION verb (йти / ходити, їхати / їздити, нести / носити …) row 1 = the unidirectional ↔ multidirectional counterpart (tags ["partner", "uni"] or ["partner", "multi"]) and the prefixed derivatives follow (по-, при-, ви-, у-, пере-, ["pf", "prefix:при-"]); then other prefixed/derived verbs by frequency, reflexive counterparts (["refl"]), then nouns/adjectives/adverbs from the root (["noun"] …); every row has a gloss with the nuance ("to have a talk (completed)")',
  },
  {
    id: 'verb-government',
    title: { en: 'Government & collocations', ru: 'Керування і сполучуваність' },
    layout: 'list',
    requiredFor: ['verb'],
    rule: 'rows = pattern in Cyrillic only (ru «розмовля́ти з ким-небудь», gloss "to talk with someone — з + instr.") + example',
  },
  {
    id: 'noun-declension',
    title: { en: 'Declension', ru: 'Відмінювання' },
    layout: 'grid',
    fixedRows: 'cases',
    colLabels: ['Singular', 'Plural'],
    requiredFor: ['noun'],
    rule: 'seven cases INCLUDING the vocative (Voc. sg. «вода́ → во́до», «стіл → столе́», «Оле́на → Оле́но», «брат → бра́те»; Voc. pl. = nominative); singularia/pluralia tantum → whole column null + note; animate accusative shown as is; mention in the section note the alternations that occur (к/г/х→ц/з/с in loc. sg. «на руці́», fleeting vowels «сон / сну», о/е→і in closed syllables «стіл / сто́лу»)',
  },
  {
    id: 'noun-family',
    title: { en: 'Word family', ru: 'Родина слова' },
    layout: 'list',
    requiredFor: ['noun'],
    rule: 'diminutive/augmentative, adjective(s), verb(s), person nouns; tags ["dim"] ["aug"] ["adj"] ["verb"]',
  },
  {
    id: 'noun-collocations',
    title: { en: 'Collocations & usage', ru: 'Сполучуваність' },
    layout: 'list',
    requiredFor: [],
    rule: 'pattern + gloss + example',
  },
  {
    id: 'adj-long',
    title: { en: 'Declension', ru: 'Відмінювання' },
    layout: 'grid',
    fixedRows: 'cases',
    colLabels: ['Masc.', 'Fem.', 'Neut.', 'Plural'],
    requiredFor: ['adj'],
    rule: 'animate/inanimate accusative as «но́вий / но́вого» in one cell + note; Ukrainian adjectives have no true vocative: the Voc. row repeats the nominative (or null + note «добрий друже»)',
  },
  {
    id: 'adj-short',
    title: { en: 'Short forms', ru: 'Короткі форми' },
    layout: 'list',
    requiredFor: [],
    rule: 'OPTIONAL: Ukrainian short (predicative) forms exist for few adjectives and are archaic («рад», «повинен»); include only if attested, else omit the section',
  },
  {
    id: 'adj-comparison',
    title: { en: 'Comparative & superlative', ru: 'Ступені порівняння' },
    layout: 'list',
    requiredFor: ['adj'],
    rule: 'simple (-іший / -ший, «новіший») + compound («більш новий») comparative, simple («найновіший») + compound («найбільш новий») superlative; suppletive forms («добрий → кращий / ліпший»)',
  },
  {
    id: 'adj-adverb',
    title: { en: 'Adverb', ru: 'Прислівник' },
    layout: 'list',
    requiredFor: [],
    rule: '',
  },
  {
    id: 'adj-family',
    title: { en: 'Word family', ru: 'Родина слова' },
    layout: 'list',
    requiredFor: [],
    rule: '',
  },
  {
    id: 'pron-declension',
    title: { en: 'Declension', ru: 'Відмінювання' },
    layout: 'grid',
    fixedRows: 'cases',
    requiredFor: [],
    rule: `pron: ${DECLENSION_FREE_COLS}; personal pronouns take the н- prefix after prepositions («у нього», «до неї», «з ним») — write it in a cell note; no vocative for pronouns → null`,
  },
  {
    id: 'num-declension',
    title: { en: 'Declension', ru: 'Відмінювання' },
    layout: 'grid',
    fixedRows: 'cases',
    requiredFor: [],
    rule: `num: ${DECLENSION_FREE_COLS}; optional and mainly for 1–4 and collective numerals («двоє», «троє»)`,
  },
  {
    id: 'name-declension',
    title: { en: 'Declension', ru: 'Відмінювання' },
    layout: 'grid',
    fixedRows: 'cases',
    requiredFor: [],
    rule: `name: ${DECLENSION_FREE_COLS}; the vocative of personal names matters («Олено», «Остапе», «Галю»)`,
  },
  {
    id: 'usage',
    title: { en: 'Usage & patterns', ru: 'Вживання' },
    layout: 'list',
    requiredFor: ['adv', 'prep', 'conj', 'part', 'other'],
    rule: 'meanings, patterns, register, example each (any POS may add it); for prepositions give the case(s) they govern',
  },
  {
    id: 'related',
    title: { en: 'Related forms', ru: 'Споріднені форми' },
    layout: 'list',
    requiredFor: [],
    rule: '',
  },
  {
    id: 'phrase-structure',
    title: { en: 'Word by word', ru: 'Розбір за словами' },
    layout: 'list',
    requiredFor: ['phrase'],
    rule: 'one row per word: ru stressed, gloss = the form («gen. pl. of воло́сся»), note = meaning here',
  },
  {
    id: 'phrase-usage',
    title: { en: 'Usage & register', ru: 'Вживання і стиль' },
    layout: 'list',
    requiredFor: ['phrase'],
    rule: 'situations, register, ≥ 2 examples via example',
  },
  {
    id: 'phrase-variants',
    title: { en: 'Variants & synonyms', ru: 'Варіанти і синоніми' },
    layout: 'list',
    requiredFor: [],
    rule: 'variants, near-synonyms, antonyms',
  },
];

/** The catalog for a language (Russian stays for upstream tests; Sutinki passes `'uk'`). */
export function catalogFor(language: ProfileLanguage): readonly CatalogEntry[] {
  return language === 'uk' ? SECTION_CATALOG_UK : SECTION_CATALOG;
}

const CATALOG_INDEXES: Record<
  ProfileLanguage,
  Map<string, { entry: CatalogEntry; index: number }>
> = {
  ru: new Map(SECTION_CATALOG.map((e, i) => [e.id, { entry: e, index: i }])),
  uk: new Map(SECTION_CATALOG_UK.map((e, i) => [e.id, { entry: e, index: i }])),
};

export function getCatalogEntry(
  id: string,
  language: ProfileLanguage = 'ru',
): CatalogEntry | undefined {
  return CATALOG_INDEXES[language].get(id)?.entry;
}

/** The fixed row labels of an entry for a language, or null when rows are free. */
export function fixedRowLabels(
  entry: CatalogEntry,
  language: ProfileLanguage,
): readonly string[] | null {
  if (!entry.fixedRows) return null;
  return entry.fixedRows === 'cases' ? CASES[language] : entry.fixedRows;
}

/** Catalog ids whose section MUST be present for `pos`, in catalog order. */
export function requiredSectionIds(pos: ProfilePos, language: ProfileLanguage = 'ru'): string[] {
  return catalogFor(language)
    .filter((e) => e.requiredFor.includes(pos))
    .map((e) => e.id);
}

/** `verb-family` row cap (§5.3, validator-enforced). */
export const VERB_FAMILY_MAX_ROWS = 14;

// --- §6.1 catalog rendering --------------------------------------------------

function quoteList(labels: readonly string[]): string {
  return `[${labels.map((l) => JSON.stringify(l)).join(', ')}]`;
}

/**
 * One line per catalog section — id · layout · title en/ru · FIXED rowLabels /
 * colLabels · required-for POS · content rule — spliced into the system
 * prompt's `{CATALOG_RENDERED_FROM_SECTION_CATALOG}` slot. Rendered from the
 * same table the validator enforces, never hand-copied.
 */
export function renderCatalogForPrompt(language: ProfileLanguage): string {
  return catalogFor(language)
    .map((e) => renderCatalogLine(e, language))
    .join('\n');
}

export function renderCatalogLine(entry: CatalogEntry, language: ProfileLanguage): string {
  const parts = [
    `- id "${entry.id}" · layout ${entry.layout} · title "${entry.title.en}" / "${entry.title.ru}"`,
  ];
  const rows = fixedRowLabels(entry, language);
  if (rows) parts.push(`rowLabels FIXED ${quoteList(rows)}`);
  if (entry.colLabels) parts.push(`colLabels ${quoteList(entry.colLabels)}`);
  else if (entry.layout === 'grid') parts.push('colLabels chosen by you (≥ 1)');
  parts.push(
    entry.requiredFor.length > 0 ? `required for ${entry.requiredFor.join(', ')}` : 'optional',
  );
  if (entry.rule) parts.push(`rule: ${entry.rule}`);
  return parts.join(' · ');
}

// --- §5.2 structural validation ---------------------------------------------

export function stripStress(s: string): string {
  return s.replaceAll(STRESS, '');
}

/** Characters a FORM (not an example sentence) may contain, once stress marks are removed. */
export const FORM_CHARS = /^[\p{Script=Cyrillic}\s\-\/(),.…!?«»]+$/u;

/** Ukrainian forms also allow the apostrophe (U+0027, U+02BC, U+2019 — ADR-0004 keeps it as authored). */
export const FORM_CHARS_UK = /^[\p{Script=Cyrillic}\s\-\/(),.…!?«»'ʼ’]+$/u;

/** Russian-only letters: a Ukrainian `plain` form containing one is a russism leak (UT13 guard). */
export const RUSSIAN_ONLY_LETTERS = /[ыэъёЫЭЪЁ]/; // intentional: Russian input

const VOWELS = /[аеёиоуыэюяАЕЁИОУЫЭЮЯ]/g;
/** Ukrainian vowel letters (є, і, ї count; ы э ё do not exist). */
const VOWELS_UK = /[аеєиіїоуюяАЕЄИІЇОУЮЯ]/g;

export interface ValidationResult {
  ok: boolean;
  /** Hard failures — verbatim into the correction turn (§5.5 step 3). */
  issues: string[];
  /** Rule 6 soft checks — surfaced in the dev readout, never a failure. */
  warnings: string[];
}

function isNfc(s: string): boolean {
  return s === s.normalize('NFC');
}

/**
 * `validateProfile(p)` — rules 1–6 of WORD_FORMS §5.2 on an already
 * Zod-parsed profile. Issue strings are path-prefixed like
 * `sections[2].grid.cells[4]: expected 2 columns, got 3`.
 */
export function validateProfile(p: WordProfile): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const language = p.language;
  const uk = language === 'uk';
  const catalogIndex = CATALOG_INDEXES[language];

  const checkForm = (path: string, ru: string, plain: string) => {
    if (!isNfc(ru)) issues.push(`${path}.ru: not NFC-normalized`);
    if (!isNfc(plain)) issues.push(`${path}.plain: not NFC-normalized`);
    if (plain !== stripStress(ru)) {
      issues.push(`${path}.plain: must equal ru with every U+0301 removed (got "${plain}")`);
    }
    if (!(uk ? FORM_CHARS_UK : FORM_CHARS).test(plain)) {
      issues.push(
        `${path}.plain: a form may contain only Cyrillic letters, spaces and -/(),.…!?«»${uk ? ' and the apostrophe' : ''} — no Latin letters, digits or labels (got "${plain}")`,
      );
    }
    if (uk && RUSSIAN_ONLY_LETTERS.test(plain)) {
      issues.push(
        `${path}.plain: contains a Russian-only letter (ы э ъ ё) — use standard Ukrainian forms, or null if the form exists only in Russian (got "${plain}")`,
      );
    }
    softStressCheck(path, ru, warnings, uk);
  };

  checkForm('headword', p.headword.ru, p.headword.plain);

  const seen = new Set<string>();
  let lastCatalogIndex = -1;
  let sawExtra = false;

  p.sections.forEach((section, i) => {
    const path = `sections[${i}]`;
    // Rule 4: unique ids.
    if (seen.has(section.id)) issues.push(`${path}.id: duplicate section id "${section.id}"`);
    seen.add(section.id);

    // Rule 3: catalog order; x- sections last; unknown non-x ids rejected.
    const isExtra = section.id.startsWith('x-');
    const catalog = catalogIndex.get(section.id);
    if (isExtra) {
      sawExtra = true;
    } else if (!catalog) {
      issues.push(
        `${path}.id: "${section.id}" is not a catalog id (extra sections must use an "x-" id)`,
      );
    } else {
      if (sawExtra) {
        issues.push(
          `${path}.id: catalog section "${section.id}" must come before every "x-" section`,
        );
      }
      if (catalog.index < lastCatalogIndex) {
        issues.push(`${path}.id: "${section.id}" is out of catalog order`);
      }
      lastCatalogIndex = Math.max(lastCatalogIndex, catalog.index);
      if (catalog.entry.layout !== section.layout) {
        issues.push(
          `${path}.layout: catalog section "${section.id}" is a ${catalog.entry.layout} section, got ${section.layout}`,
        );
      }
    }

    // Rule 4: layout ↔ grid/rows.
    if (section.layout === 'grid') {
      if (!section.grid) issues.push(`${path}.grid: required for layout "grid"`);
      if (section.rows) issues.push(`${path}.rows: must be absent for layout "grid"`);
    } else {
      if (!section.rows) issues.push(`${path}.rows: required for layout "list"`);
      if (section.grid) issues.push(`${path}.grid: must be absent for layout "list"`);
    }

    // Rule 2: grid dimensions + fixed labels.
    if (section.grid) {
      const { rowLabels, colLabels, cells } = section.grid;
      const fixed = catalog ? fixedRowLabels(catalog.entry, language) : null;
      if (fixed && !labelsMatch(fixed, rowLabels)) {
        issues.push(
          `${path}.grid.rowLabels: must be exactly ${quoteList(fixed)} (FIXED), got ${quoteList(rowLabels)}`,
        );
      }
      if (cells.length !== rowLabels.length) {
        issues.push(
          `${path}.grid.cells: expected ${rowLabels.length} rows (one per rowLabel), got ${cells.length}`,
        );
      }
      cells.forEach((row, r) => {
        if (row.length !== colLabels.length) {
          issues.push(
            `${path}.grid.cells[${r}]: expected ${colLabels.length} columns, got ${row.length}`,
          );
        }
        row.forEach((cell, c) => {
          if (cell) checkForm(`${path}.grid.cells[${r}][${c}]`, cell.ru, cell.plain);
        });
      });
    }

    // Rules 1 + 5 for list sections.
    if (section.rows) {
      if (section.rows.length === 0) {
        issues.push(
          `${path}.rows: a list section needs at least one row — omit the section instead (and explain in overview.notes)`,
        );
      }
      if (section.id === 'verb-family' && section.rows.length > VERB_FAMILY_MAX_ROWS) {
        issues.push(
          `${path}.rows: verb-family may have at most ${VERB_FAMILY_MAX_ROWS} rows, got ${section.rows.length}`,
        );
      }
      section.rows.forEach((row, r) => {
        checkForm(`${path}.rows[${r}]`, row.ru, row.plain);
        if (row.example && !isNfc(row.example.ru)) {
          issues.push(`${path}.rows[${r}].example.ru: not NFC-normalized`);
        }
      });
    }
  });

  // Rule 3: required sections per POS.
  for (const id of requiredSectionIds(p.pos, language)) {
    if (!seen.has(id)) {
      issues.push(`sections: required section "${id}" for pos "${p.pos}" is missing`);
    }
  }

  return { ok: issues.length === 0, issues, warnings };
}

function labelsMatch(expected: readonly string[], got: readonly string[]): boolean {
  if (expected.length !== got.length) return false;
  return expected.every((label, i) => label.trim() === got[i]!.trim());
}

/**
 * Rule 6 (soft): a polysyllabic form (≥ 2 vowels) that carries neither ё nor
 * any U+0301 is probably missing its stress. Checked per whitespace-/slash-
 * separated token so a half-stressed compound («бу́ду говорить») still warns.
 */
function softStressCheck(path: string, ru: string, warnings: string[], uk = false) {
  for (const token of ru.split(/[\s/]+/)) {
    if (token.includes(STRESS) || (!uk && /ё/i.test(token))) continue;
    const vowels = token.match(uk ? VOWELS_UK : VOWELS)?.length ?? 0;
    if (vowels >= 2) {
      warnings.push(`${path}.ru: "${token}" has ${vowels} vowels but no stress mark`);
    }
  }
}

// --- §5.4 profile key ---------------------------------------------------------

export interface ProfileKey {
  lemmaNorm: string;
  kind: ProfileKind;
}

/**
 * The profile key of a bank item — the bank dedup key: `lemma_norm` for
 * words, `normalized` for phrases. Words without a lemma (needs-enrichment
 * items) have NO key → null (the Forms tab says «Add a lemma first»).
 */
export function profileKeyFor(
  item: Pick<BankItemRow, 'kind' | 'lemmaNorm' | 'normalized'>,
): ProfileKey | null {
  if (item.kind === 'phrase') return { lemmaNorm: item.normalized, kind: 'phrase' };
  if (!item.lemmaNorm) return null;
  return { lemmaNorm: item.lemmaNorm, kind: 'word' };
}
