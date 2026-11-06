import type { ChatMessage } from '../client';

import { SPEAKING_RUBRICS, type SpeakingRubricKind } from '@/features/torfl/grading/rubrics';
import { profileFor, type ExamLevel } from '@/features/torfl/level-profile';

/**
 * «Іспит» speaking rubric prompt (UT17b, UKR_EXAM_PREP §2 Говоріння). The examiner grades ONE recorded answer
 * from its ASR transcript(s) — a photo description (task 46), the monologue (47) or one dialogue reply (48) — on
 * the Commission's criteria rescaled to Σ = 100 (`features/torfl/grading/rubrics.ts`, rendered into this prompt),
 * returns a cleaned-up model of what the candidate said, and pins the JSON `ExamGradeSchema` parses. The schema,
 * `features/torfl/grading/speaking.ts` and this contract move together (the fixture tests pin all three).
 *
 * The transcripts come from on-device Ukrainian recognizers with no punctuation and occasional mis-hearings; the
 * grader is told so and asked to judge MEANING, not transcription noise. When the Whisper assist transcript
 * exists it is given too (and preferred for longer speech). An unofficial estimate «за зразком державного
 * іспиту», never "official grading".
 */

export type ExamSpeakingTask = 'reply' | 'situation' | 'monologue' | 'photo';

export interface ExamSpeakingInput {
  task: ExamSpeakingTask;
  /** Dialogue: the examiner's line; situation: the situation as read aloud; monologue / photo: the topic title. */
  promptUk: string;
  /** Situation text as printed (Ukrainian). */
  situationUk?: string | null;
  /** Monologue / photo: the guiding questions (Ukrainian), or what the picture should have mentioned. */
  questionsUk?: string[];
  /** Photo: the plain-text description of the picture (what is actually in it). */
  imageAlt?: string | null;
  /** Monologue / photo: the asked number of phrases. */
  minSentences?: number;
  maxSentences?: number;
  /** The primary ASR transcript. */
  transcript: string;
  /** The Whisper assist re-decode, when installed. */
  assistTranscript?: string | null;
  /** The model answer (dialogue: `accept[0]`; monologue: the model text) — calibration only. */
  modelAnswer?: string | null;
  /** The exam level; absent = A1. */
  level?: ExamLevel;
}

function rubricKind(task: ExamSpeakingTask): SpeakingRubricKind {
  return task === 'monologue' ? 'monologue' : task === 'photo' ? 'photo' : 'dialogue';
}

export function examSpeakingCriteriaText(kind: SpeakingRubricKind): string {
  const lines = SPEAKING_RUBRICS[kind].map((c) => `- "${c.id}" (${c.max}): ${c.hint}.`);
  return `Criteria (max points; they sum to 100):\n${lines.join('\n')}`;
}

function jsonShape(kind: SpeakingRubricKind): string {
  const rows = SPEAKING_RUBRICS[kind]
    .map((c) => `    { "id": "${c.id}", "score": <0-${c.max}>, "max": ${c.max}, "comment": "<…>" }`)
    .join(',\n');
  return `{
  "criteria": [
${rows}
  ],
  "corrected": "<the cleaned-up answer>",
  "changes": [ { "before": "<…>", "after": "<…>", "explanation": "<…>" } ],
  "tips": ["<…>", "<…>"]
}`;
}

/** The system prompt for a task and level. */
export function examSpeakingSystem(task: ExamSpeakingTask, level: ExamLevel = 'A1'): string {
  const profile = profileFor(level);
  const kind = rubricKind(task);
  const what =
    task === 'photo'
      ? 'task 46, a PHOTO DESCRIPTION: the candidate sees a picture and describes it (place, people, objects, the event and mood)'
      : task === 'monologue'
        ? 'task 47, the MONOLOGUE: the candidate prepared a talk on the proposed theme with its guiding points and speaks on it'
        : task === 'situation'
          ? 'task 48, a DIALOGUE turn: the candidate reads a situation and starts the conversation'
          : 'task 48, a DIALOGUE turn: the examiner says one line and the candidate answers; «так», «ні», «не знаю» alone is not a full answer';
  return `You are an examiner of the Ukrainian state-language exam («іспит на рівень володіння державною мовою») grading the Говоріння (speaking) part, for one adult English-speaking candidate who also knows Russian. You are grading ${what}. This is an unofficial estimate in the style of the state exam (${profile.aiStandard}) — never call it official grading.

You do NOT hear the audio. You receive the candidate's answer as an AUTOMATIC SPEECH RECOGNITION transcript (sometimes two: an on-device Ukrainian recognizer and a Whisper re-decode). ASR has no punctuation and may mis-hear a word (a case ending, a name, a city). Judge the MEANING the candidate most plausibly produced; never penalize what is clearly a transcription artefact, and never reward a word the candidate plausibly did not say. When two transcripts disagree, take the reading more consistent with the task.

Grade honestly at the level — ${profile.aiStandard}: the exam asks for simple, correct, on-task spoken communication — not literary Ukrainian, and an answer is not marked down for not being a higher level. Language norm: standard literary Ukrainian; Russian words, forms or calques (surzhyk) in the transcript are errors to flag, never accepted.

${examSpeakingCriteriaText(kind)}

Scores may use halves (e.g. 17.5). Never exceed a criterion's max. Σ max is 100.

Corrections:
- "corrected": what the candidate said, written out as clean correct Ukrainian with punctuation — identical in content where nothing needed fixing. Keep the candidate's meaning, order and voice; fix real errors only; do not upgrade vocabulary or add content. Empty string if nothing was said.
- "changes": one entry per real change, with the exact "before" snippet from the transcript, the "after" snippet (Ukrainian), and a short ENGLISH "explanation" that names the rule (case, aspect, agreement, register, surzhyk/Russianism, …). Do not list ASR artefacts as changes.
- "tips": 2–3 short English tips for the next answer, most useful first.
- Each criterion's "comment": one or two English sentences saying what earned or cost points — concrete, quoting Ukrainian where helpful.

Respond with ONLY a JSON object, no markdown fences, no prose around it:
${jsonShape(kind)}`;
}

export function buildExamSpeakingMessages(input: ExamSpeakingInput): ChatMessage[] {
  const lines: string[] = [];
  if (input.task === 'reply') {
    lines.push("THE EXAMINER'S LINE (spoken once):", input.promptUk);
  } else if (input.task === 'situation') {
    lines.push('THE SITUATION (as printed and read aloud):', input.situationUk ?? input.promptUk);
  } else {
    lines.push(input.task === 'photo' ? 'THE PHOTO TASK:' : 'THE THEME:', input.promptUk);
    if (input.task === 'photo' && input.imageAlt) {
      lines.push('', 'What the picture shows (for you, the examiner):', input.imageAlt);
    }
    if (input.questionsUk && input.questionsUk.length > 0) {
      lines.push('', input.task === 'photo' ? 'Points to mention:' : 'Guiding points:');
      input.questionsUk.forEach((q, i) => lines.push(`  ${i + 1}. ${q}`));
    }
    const min = input.minSentences ?? profileFor(input.level ?? 'A1').monologueSentences.min;
    const max = input.maxSentences ?? profileFor(input.level ?? 'A1').monologueSentences.max;
    lines.push('', `Required: ${min}–${max} phrases.`);
  }
  if (input.modelAnswer) {
    lines.push(
      '',
      'A MODEL ANSWER (calibration only — the candidate may say different true things; do not grade against its content):',
      input.modelAnswer,
    );
  }
  lines.push('', "THE CANDIDATE'S ANSWER — ASR transcript (on-device Ukrainian recognizer):");
  lines.push(input.transcript.trim().length > 0 ? input.transcript : '(nothing recognized)');
  if (input.assistTranscript && input.assistTranscript.trim().length > 0) {
    lines.push(
      '',
      input.task === 'monologue' || input.task === 'photo'
        ? 'The same recording re-decoded by Whisper (usually the better reading for longer speech):'
        : 'The same recording re-decoded by Whisper:',
      input.assistTranscript,
    );
  }
  return [
    { role: 'system', content: examSpeakingSystem(input.task, input.level) },
    { role: 'user', content: lines.join('\n') },
  ];
}
