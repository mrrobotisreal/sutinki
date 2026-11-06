import type { ChatMessage } from '../client';

import { WRITING_RUBRICS, type WritingKind } from '@/features/torfl/grading/rubrics';
import { profileFor, type ExamLevel } from '@/features/torfl/level-profile';

/**
 * «Іспит» writing rubric prompt (UT17b, UKR_EXAM_PREP §2 Письмо). The examiner grades ONE text (task 44-style
 * short message or task 45-style detailed text) against the task exactly as printed, on the Commission's criteria
 * rescaled to Σ = 100 (`features/torfl/grading/rubrics.ts` — the criteria ids and maxima are DATA there and are
 * rendered into this prompt), returns Ukrainian corrections with English explanations, and pins the JSON
 * `ExamGradeSchema` parses. The schema and this contract move together (the fixture tests pin both).
 *
 * The standard is HONEST for the level (`aiStandard` in the level profile): an A1 message is not marked down for
 * not being B1. The learner is an English-speaking adult who knows Russian — Russian forms/words in the Ukrainian
 * text are errors to flag (surzhyk), never accepted. «Жодна частина не передбачає перевірки правил правопису;
 * однотипні помилки, що не спотворюють змісту, не впливають на результат» [prep]: recurring non-distorting errors
 * count lightly. This is an unofficial estimate «за зразком державного іспиту», never "official grading".
 */

export interface ExamWritingInput {
  /** The task text as the exam prints it (Ukrainian). */
  taskUk: string;
  /** The points to cover, in order, Ukrainian text. */
  bullets: { id: string; uk: string }[];
  minSentences: number;
  minQuestions: number;
  maxQuestions?: number | null;
  /** The word limits of the task, when it has them. */
  minWords?: number | null;
  maxWords?: number | null;
  /** The candidate's text. */
  letter: string;
  /** The model text when the pack has one (Ukrainian, plain text) — a calibration anchor, not the answer key. */
  modelLetter?: string | null;
  /** The exam level; absent = A1. */
  level?: ExamLevel;
  /** The writing item's topic slug — `wr-message` selects the short-message rubric, `wr-text` the detailed text. */
  taskTopic?: string | null;
}

function kindOf(input: Pick<ExamWritingInput, 'taskTopic' | 'minWords'>): WritingKind {
  if (input.taskTopic === 'wr-text') return 'text';
  if (input.taskTopic === 'wr-message') return 'message';
  return (input.minWords ?? 0) >= 50 ? 'text' : 'message';
}

export function examWritingCriteriaText(kind: WritingKind): string {
  const lines = WRITING_RUBRICS[kind].map((c) => `- "${c.id}" (${c.max}): ${c.hint}.`);
  return `Criteria (max points; they sum to 100):\n${lines.join('\n')}`;
}

function jsonShape(kind: WritingKind): string {
  const rows = WRITING_RUBRICS[kind]
    .map((c) => `    { "id": "${c.id}", "score": <0-${c.max}>, "max": ${c.max}, "comment": "<…>" }`)
    .join(',\n');
  return `{
  "criteria": [
${rows}
  ],
  "corrected": "<the full corrected text>",
  "changes": [ { "before": "<…>", "after": "<…>", "explanation": "<…>" } ],
  "tips": ["<…>", "<…>"]
}`;
}

/** The system prompt for a level and a task kind. */
export function examWritingSystem(level: ExamLevel = 'A1', kind: WritingKind = 'message'): string {
  const profile = profileFor(level);
  const what =
    kind === 'message' ? 'a short message (task 44)' : 'a detailed text on a theme (task 45)';
  return `You are an examiner of the Ukrainian state-language exam («іспит на рівень володіння державною мовою») grading the Письмо (writing) part, for one adult English-speaking candidate who also knows Russian. You are grading ${what}. This is an unofficial estimate in the style of the state exam (${profile.aiStandard}) — never call it official grading.

You receive the task exactly as printed (situation + points to cover + the required counts and word limits) and the candidate's text. Grade honestly at the level — ${profile.aiStandard}: the exam asks for a simple, clear, complete and mostly correct text that does what the task asks — not literary Ukrainian, and a text is not marked down for not being a higher level.

Language norm: standard literary Ukrainian. Russian words, forms or calques in the candidate's text (surzhyk: «приймати участь», «слідуючий», «кушати», Russian endings or the letters \u044b \u044d \u044a \u0451) are errors to flag and correct, never accepted. The apostrophe (') and ґ are part of the spelling. The exam does not test spelling rules for their own sake: recurring errors that do not distort the meaning count lightly, never mechanically per slip.

${examWritingCriteriaText(kind)}

Scores may use halves (e.g. 17.5). Never exceed a criterion's max. Σ max is 100.

Corrections:
- "corrected": the full text, corrected — identical where nothing needed fixing. Keep the candidate's meaning, order and voice; fix real errors only; do not upgrade vocabulary or add content. Write it in Ukrainian.
- "changes": one entry per real change, with the exact "before" snippet from the text, the "after" snippet (Ukrainian), and a short ENGLISH "explanation" that names the rule (case, aspect, agreement, preposition, surzhyk/Russianism, spelling, …).
- "tips": 2–3 short English tips for the next text, most useful first.
- Each criterion's "comment": one or two English sentences saying what earned or cost points — concrete, quoting Ukrainian where helpful.

Respond with ONLY a JSON object, no markdown fences, no prose around it:
${jsonShape(kind)}`;
}

export function buildExamWritingMessages(input: ExamWritingInput): ChatMessage[] {
  const kind = kindOf(input);
  const bullets = input.bullets.map((b, i) => `  ${i + 1}. ${b.uk}`).join('\n');
  const questions =
    input.maxQuestions != null
      ? `${input.minQuestions}–${input.maxQuestions} questions`
      : input.minQuestions > 0
        ? `at least ${input.minQuestions} question(s)`
        : 'no question quota';
  const words =
    input.minWords != null || input.maxWords != null
      ? ` Word limit: ${input.minWords ?? 0}${input.maxWords != null ? `–${input.maxWords}` : '+'} words.`
      : '';
  const lines = [
    'THE TASK (as printed):',
    input.taskUk,
    '',
    'Points to cover:',
    bullets,
    '',
    `Required: at least ${input.minSentences} sentences in total, ${questions}.${words}`,
  ];
  if (input.modelLetter) {
    lines.push(
      '',
      'A MODEL TEXT for this task (calibration only — the candidate may say different true things; do not grade against its content):',
      input.modelLetter,
    );
  }
  lines.push(
    '',
    kind === 'message' ? "THE CANDIDATE'S MESSAGE:" : "THE CANDIDATE'S TEXT:",
    input.letter,
  );
  return [
    { role: 'system', content: examWritingSystem(input.level, kind) },
    { role: 'user', content: lines.join('\n') },
  ];
}
