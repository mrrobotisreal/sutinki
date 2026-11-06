import { UKR_STATE_SUBTEST_ORDER, type ExamSubtestKind } from '@sutinki/schema';

import type { IoniconName } from '@/features/library/categories';

/**
 * «Іспит» labels the app owns (UT16b, UKR_EXAM_PREP §4): packs carry topic
 * SLUGS only and the app renders them. Like the M14 category sets, an
 * unknown slug renders raw and is never dropped, so a content session can coin
 * a topic before the app learns its label. Three families: per-section SKILL
 * slugs, the 12 THEME slugs (valid under any section) and the grammar slugs
 * `g01…g38` of the study-only grammar drills. Pure module, unit-tested.
 */

export interface TopicLabel {
  uk: string;
  en: string;
  /** The section a skill/grammar slug belongs to; null for the cross-section themes. */
  subtestKind: ExamSubtestKind | null;
}

const skill = (uk: string, en: string, subtestKind: ExamSubtestKind): TopicLabel => ({
  uk,
  en,
  subtestKind,
});
const theme = (uk: string, en: string): TopicLabel => ({ uk, en, subtestKind: null });

/** Skill slugs, in tile order inside a section tab. */
const SKILLS = {
  'ls-mc3': skill('Слухання: оберіть відповідь', 'Listening: pick the answer', 'listening'),
  'ls-tf': skill('Слухання: правда чи ні', 'Listening: true or false', 'listening'),
  'rd-heading': skill('Заголовки до текстів', 'Match the headings', 'reading'),
  'rd-tf': skill('Правда / неправда', 'True / false', 'reading'),
  'rd-qa': skill('Питання й відповіді', 'Questions and answers', 'reading'),
  'rd-gap-word': skill('Пропуск: слово', 'Gap: the word', 'reading'),
  'rd-gap-form': skill('Пропуск: форма слова', 'Gap: the word form', 'reading'),
  'rd-detail': skill('Текст і запитання', 'Text and questions', 'reading'),
  'wr-message': skill('Записка, повідомлення', 'A note or message', 'writing'),
  'wr-text': skill('Розгорнутий текст', 'A longer text', 'writing'),
  'sp-photo': skill('Опис фото', 'Describe a photo', 'speaking'),
  'sp-monologue': skill('Монолог', 'Monologue', 'speaking'),
  'sp-dialogue': skill('Діалог', 'Dialogue', 'speaking'),
} as const satisfies Record<string, TopicLabel>;

/** The 12 themes (Standard Catalogue Б, A1 3.1–3.12). */
const THEMES = {
  liudyna: theme('Людина', 'The person'),
  dim: theme('Дім', 'Home'),
  misto: theme('Місто', 'The city'),
  pobut: theme('Побут', 'Daily life'),
  diialnist: theme('Діяльність', 'Activities'),
  dozvillia: theme('Дозвілля', 'Free time'),
  podorozhi: theme('Подорожі', 'Travel'),
  kupivlia: theme('Купівля', 'Shopping'),
  iidalnia: theme('Їжа', 'Food'),
  zdorovia: theme('Здоров’я', 'Health'),
  pryroda: theme('Природа', 'Nature'),
  sviata: theme('Свята', 'Holidays'),
} as const satisfies Record<string, TopicLabel>;

/** Grammar slugs g01…g38 = the grammar ids of the A1 grammar list (study-only drills). */
const GRAMMAR_ROWS: readonly (readonly [string, string])[] = [
  ['Абетка, великі літери', 'Alphabet and capitals'],
  ['Апостроф, м’який знак', 'Apostrophe and soft sign'],
  ['Голосні й приголосні, наголос', 'Vowels, consonants, stress'],
  ['Інтонація', 'Intonation'],
  ['Милозвучність: в/у, і/й, з/із/зі', 'Euphony: в/у, і/й, з/із/зі'],
  ['Рід іменників', 'Noun gender'],
  ['Називний відмінок множини', 'Nominative plural'],
  ['Особові займенники, ти/ви/Ви', 'Personal pronouns, ти/ви/Ви'],
  ['Присвійні й вказівні займенники', 'Possessives and demonstratives'],
  ['Узгодження прикметників', 'Adjective agreement'],
  ['Це …, Мене звати …', 'Identification: Це …, Мене звати …'],
  ['Кличний відмінок', 'Vocative case'],
  ['Теперішній час, дієвідміни, -ся', 'Present tense and conjugations'],
  ['Неправильні дієслова', 'Irregular verbs'],
  ['Є / нема(є)', 'Є / нема(є)'],
  ['Заперечення, так / ні', 'Negation, yes / no'],
  ['Питання', 'Questions'],
  ['Сполучники: і, а, але, бо', 'Conjunctions: і, а, але, бо'],
  ['Місцевий відмінок', 'Locative case'],
  ['Знахідний відмінок', 'Accusative case'],
  ['Знахідний із прийменниками', 'Accusative with prepositions'],
  ['Займенники в непрямих відмінках', 'Pronoun case forms'],
  ['Минулий час', 'Past tense'],
  ['Майбутній час', 'Future tense'],
  ['Слова на позначення часу', 'Time words'],
  ['Наказовий спосіб', 'Imperative'],
  ['Родовий відмінок', 'Genitive case'],
  ['Числівники', 'Numerals'],
  ['Давальний відмінок', 'Dative case'],
  ['Орудний відмінок', 'Instrumental case'],
  ['Дієслова руху', 'Verbs of motion'],
  ['Час, дати, ціни', 'Time, dates, prices'],
  ['Короткі письмові тексти', 'Short written texts'],
  ['Стратегії читання, форма слова', 'Reading strategies, word form'],
  ['Стратегії слухання', 'Listening strategies'],
  ['Завдання з говоріння', 'Speaking tasks'],
  ['Складнопідрядні речення', 'Subordinate clauses'],
  ['Пастки слів', 'Word traps'],
];
const GRAMMAR: Record<string, TopicLabel> = Object.fromEntries(
  GRAMMAR_ROWS.map(([uk, en], i) => [
    `g${String(i + 1).padStart(2, '0')}`,
    skill(uk, en, 'lexgram'),
  ]),
);

export const TOPICS: Readonly<Record<string, TopicLabel>> = {
  ...SKILLS,
  ...THEMES,
  ...GRAMMAR,
};

export type TopicSlug = string;
export const TOPIC_ORDER: readonly string[] = Object.keys(TOPICS);
const ORDER_INDEX = new Map(TOPIC_ORDER.map((slug, i) => [slug, i]));

export function isKnownTopic(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(TOPICS, slug);
}

/** Known → its label; unknown → the raw slug (section unknown → null). */
export function topicLabel(slug: string): TopicLabel {
  return isKnownTopic(slug) ? TOPICS[slug]! : { uk: slug, en: slug, subtestKind: null };
}

/** Sort key for topic slugs: table order first, unknown slugs after, alphabetically. Stable across renders. */
export function compareTopics(a: string, b: string): number {
  const ia = ORDER_INDEX.get(a);
  const ib = ORDER_INDEX.get(b);
  if (ia !== undefined || ib !== undefined) {
    if (ia === undefined) return 1;
    if (ib === undefined) return -1;
    return ia - ib;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

export interface SubtestLabel {
  /** Full title. */
  uk: string;
  /** Short form for tabs and readiness rows. */
  short: string;
  en: string;
  icon: IoniconName;
}

/** The four sections of the state exam plus the study-only grammar drills, keyed by kind. */
export const SUBTEST_LABELS: Record<ExamSubtestKind, SubtestLabel> = {
  listening: { uk: 'Слухання', short: 'Слухання', en: 'Listening', icon: 'headset-outline' },
  reading: { uk: 'Читання', short: 'Читання', en: 'Reading', icon: 'reader-outline' },
  writing: { uk: 'Письмо', short: 'Письмо', en: 'Writing', icon: 'create-outline' },
  speaking: { uk: 'Говоріння', short: 'Говоріння', en: 'Speaking', icon: 'mic-outline' },
  lexgram: {
    uk: 'Граматика (тренування)',
    short: 'Граматика',
    en: 'Grammar (study only)',
    icon: 'extension-puzzle-outline',
  },
};

/**
 * Every kind the shelf can show, in order: the four state-exam sections, then the
 * study-only grammar drills. A level's own list comes from its shape sections
 * (`sectionKindsOf`) — never from this constant.
 */
export const SUBTEST_ORDER: readonly ExamSubtestKind[] = [...UKR_STATE_SUBTEST_ORDER, 'lexgram'];
