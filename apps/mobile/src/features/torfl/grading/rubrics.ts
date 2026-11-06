/**
 * The Ukrainian-examiner rubrics (UT17b) as DATA — PURE, no UI imports (the AI prompts, the offline graders,
 * the review screens and the self-check all read this one table).
 *
 * Source: docs/design/UKR_EXAM_PREP.md §2 (B1 official, `[reg20 IV.1]`; A1/A2 "rubrics and point weights as B1",
 * `[modelled]`). The Commission's point splits are rescaled to a 0–100 scale PER RESPONSE (integer maxima, Σ = 100)
 * so one `ExamGrade` envelope (Σ max = 100) serves every task; the response row then carries its share of the
 * section's maximum (33 writing / 38 speaking points: `taskPoints` below), so the section % is exactly
 * Σ points / 33 (or 38) — the Commission's own arithmetic.
 *
 *   Письмо  task 44 («message», 10 pts): зміст 4 · форма 1 · нормативність 4 · обсяг 1        → 40 / 10 / 40 / 10
 *   Письмо  task 45 («text»,   23 pts): зміст 5 · форма 1 · відповідність умові 2 · логічність і зв'язність 6 ·
 *                                        нормативність 6 · багатство мовних засобів 2 · обсяг 1 → 22 / 4 / 9 / 26 / 26 / 9 / 4
 *   Говоріння 46 («photo»,    14 pts): зміст 4 · структура 6 · мовна компетентність 4          → 29 / 42 / 29
 *   Говоріння 47 («monologue», 10 pts): зміст 4 · структура 2 · мовна компетентність 4          → 40 / 20 / 40
 *   Говоріння 48 («dialogue», 14 pts): зміст і комунікативний намір 4 · точність відповідей і самовираження 3 ·
 *                                        повнота 5 · нормативність 1 · лексико-граматичний діапазон 1 → 29 / 21 / 36 / 7 / 7
 *
 * `offline` marks the criteria a machine can judge without a model (counts, cue coverage, the M17 judge); the rest is
 * AI-only (or the self-check). Provisional offline % = Σ offline score / Σ offline max.
 */

export type WritingKind = 'message' | 'text';
export type SpeakingRubricKind = 'photo' | 'monologue' | 'dialogue';

export interface RubricCriterion {
  id: string;
  max: number;
  offline: boolean;
  uk: string;
  en: string;
  /** English hint to the AI examiner (the prompt text). */
  hint: string;
}

const sum = (list: readonly { max: number }[]) => list.reduce((n, c) => n + c.max, 0);

export const WRITING_RUBRICS: Record<WritingKind, readonly RubricCriterion[]> = {
  message: [
    {
      id: 'content',
      max: 40,
      offline: true,
      uk: 'Зміст',
      en: 'Content',
      hint: 'does the message do what the situation asks — every demanded piece of information present and correct (4 of 10 Commission points)',
    },
    {
      id: 'form',
      max: 10,
      offline: true,
      uk: 'Відповідність формі',
      en: 'Form',
      hint: 'the genre fits (оголошення / записка / запрошення / привітання): a greeting or a sign-off, the right register and address (1 of 10)',
    },
    {
      id: 'norms',
      max: 40,
      offline: false,
      uk: 'Нормативність',
      en: 'Language norms',
      hint: 'grammar, word choice and spelling against the literary norm; recurring errors that do not distort meaning count lightly (4 of 10)',
    },
    {
      id: 'volume',
      max: 10,
      offline: true,
      uk: 'Обсяг',
      en: 'Length',
      hint: 'the word limit is respected (1 of 10)',
    },
  ],
  text: [
    {
      id: 'content',
      max: 22,
      offline: true,
      uk: 'Зміст',
      en: 'Content',
      hint: 'each of the mandatory points is covered with real information (5 of 23)',
    },
    {
      id: 'form',
      max: 4,
      offline: true,
      uk: 'Форма',
      en: 'Form',
      hint: 'a text, not a list: opening, body and closing in paragraphs (1 of 23)',
    },
    {
      id: 'fit',
      max: 9,
      offline: false,
      uk: 'Відповідність умові',
      en: 'Fit to the task',
      hint: 'the text answers the theme as posed, in the asked genre and register (2 of 23)',
    },
    {
      id: 'coherence',
      max: 26,
      offline: false,
      uk: "Логічність і зв'язність",
      en: 'Logic & cohesion',
      hint: 'ideas follow one another, connectors (тому що, але, проте, коли, щоб) link them, no contradictions (6 of 23)',
    },
    {
      id: 'norms',
      max: 26,
      offline: false,
      uk: 'Нормативність',
      en: 'Language norms',
      hint: 'grammar, word choice and spelling against the literary norm; recurring errors that do not distort meaning count lightly (6 of 23)',
    },
    {
      id: 'richness',
      max: 9,
      offline: false,
      uk: 'Багатство мовних засобів',
      en: 'Range of language',
      hint: 'varied vocabulary and structures for the level — not repeating the same few words or one sentence pattern (2 of 23)',
    },
    {
      id: 'volume',
      max: 4,
      offline: true,
      uk: 'Обсяг',
      en: 'Length',
      hint: 'the word limit is respected (1 of 23)',
    },
  ],
};

export const SPEAKING_RUBRICS: Record<SpeakingRubricKind, readonly RubricCriterion[]> = {
  photo: [
    {
      id: 'content',
      max: 29,
      offline: true,
      uk: 'Зміст',
      en: 'Content',
      hint: 'place, people, objects and the event/mood of the picture are described (4 of 14)',
    },
    {
      id: 'structure',
      max: 42,
      offline: true,
      uk: 'Структура',
      en: 'Structure',
      hint: 'a planned description — opening, order of details, closing — in the asked number of phrases, spoken fluently (6 of 14)',
    },
    {
      id: 'competence',
      max: 29,
      offline: false,
      uk: 'Мовна компетентність',
      en: 'Language competence',
      hint: 'grammar, vocabulary and pronunciation-as-visible-in-the-transcript against the norm (4 of 14)',
    },
  ],
  monologue: [
    {
      id: 'content',
      max: 40,
      offline: true,
      uk: 'Зміст',
      en: 'Content',
      hint: 'the theme is developed and the guiding points answered (4 of 10)',
    },
    {
      id: 'structure',
      max: 20,
      offline: true,
      uk: 'Структура',
      en: 'Structure',
      hint: 'organised talk (opening, development, ending) in the asked number of phrases, spoken fluently (2 of 10)',
    },
    {
      id: 'competence',
      max: 40,
      offline: false,
      uk: 'Мовна компетентність',
      en: 'Language competence',
      hint: 'grammar, vocabulary and range against the norm (4 of 10)',
    },
  ],
  dialogue: [
    {
      id: 'content',
      max: 29,
      offline: true,
      uk: 'Зміст і комунікативний намір',
      en: 'Content & intent',
      hint: 'the reply fits the examiner line and achieves its communicative aim (4 of 14)',
    },
    {
      id: 'accuracy',
      max: 21,
      offline: false,
      uk: 'Точність відповіді і самовираження',
      en: 'Accuracy & self-expression',
      hint: 'the information asked for is given precisely, in the speaker’s own words (3 of 14)',
    },
    {
      id: 'fullness',
      max: 36,
      offline: true,
      uk: 'Повнота',
      en: 'Completeness',
      hint: 'a full answer — a sentence carrying the asked-for content, not a bare word or yes/no (5 of 14)',
    },
    {
      id: 'norms',
      max: 7,
      offline: false,
      uk: 'Нормативність',
      en: 'Language norms',
      hint: 'grammar and word forms against the norm (1 of 14)',
    },
    {
      id: 'range',
      max: 7,
      offline: false,
      uk: 'Лексико-граматичний діапазон',
      en: 'Lexical & grammatical range',
      hint: 'a range of words and structures that fits the level (1 of 14)',
    },
  ],
};

/** The Commission points one task is worth [reg20 IV.1] — the weights of the section arithmetic. */
export const WRITING_TASK_POINTS: Record<WritingKind, number> = { message: 10, text: 23 };
export const SPEAKING_TASK_POINTS: Record<SpeakingRubricKind, number> = {
  photo: 14,
  monologue: 10,
  dialogue: 14,
};

export function rubricMax(list: readonly RubricCriterion[]): number {
  return sum(list);
}
export function offlineMaxOf(list: readonly RubricCriterion[]): number {
  return sum(list.filter((c) => c.offline));
}
export function aiOnlyIdsOf(list: readonly RubricCriterion[]): string[] {
  return list.filter((c) => !c.offline).map((c) => c.id);
}

export function labelIn(list: readonly RubricCriterion[], id: string): { uk: string; en: string } {
  const hit = list.find((c) => c.id === id);
  return hit ? { uk: hit.uk, en: hit.en } : { uk: id, en: id };
}

/** Every rubric id → label (for a screen that does not know the task). */
export function anyCriterionLabel(id: string): { uk: string; en: string } {
  for (const list of [...Object.values(WRITING_RUBRICS), ...Object.values(SPEAKING_RUBRICS)]) {
    const hit = list.find((c) => c.id === id);
    if (hit) return { uk: hit.uk, en: hit.en };
  }
  return { uk: id, en: id };
}
