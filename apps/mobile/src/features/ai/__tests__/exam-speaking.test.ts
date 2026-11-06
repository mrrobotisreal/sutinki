import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { SPEAKING_RUBRICS, rubricMax } from '../../torfl/grading/rubrics';
import { UK_CAPTURE_CASES } from '../dev/exam-uk-cases';
import { buildExamSpeakingMessages, type ExamSpeakingInput } from '../prompts/exam-speaking';
import { parseExamGrade } from '../schemas';

/** UT17b: the Ukrainian exam-speaking prompt contract + `_synthetic` fixtures (photo · monologue · dialogue). */
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__');
interface Fixture {
  _synthetic?: boolean;
  input: ExamSpeakingInput;
  choices: { message: { content: string }; finish_reason: string | null }[];
}
const load = (name: string) =>
  JSON.parse(readFileSync(path.join(FIXTURES, name), 'utf8')) as Fixture;
const FILES = readdirSync(FIXTURES).filter((f) => f.startsWith('exam-uk-speaking-'));

describe('exam-speaking prompt (Ukrainian examiner)', () => {
  it('dialogue reply: examiner line, ASR caveat, both transcripts, the five dialogue ids', () => {
    const messages = buildExamSpeakingMessages({
      task: 'reply',
      promptUk: 'Де ви зараз живете?',
      transcript: 'я живу в колорадо',
      assistTranscript: 'Я живу в Колорадо.',
      modelAnswer: 'Я зараз живу в Києві.',
    });
    const sys = messages[0]!.content;
    for (const c of SPEAKING_RUBRICS.dialogue) expect(sys).toContain(`"id": "${c.id}"`);
    expect(rubricMax(SPEAKING_RUBRICS.dialogue)).toBe(100);
    expect(sys).toContain('AUTOMATIC SPEECH RECOGNITION');
    expect(sys).toContain('task 48');
    expect(sys).toContain('surzhyk');
    expect(sys).not.toContain('TORFL');
    const user = messages[1]!.content;
    expect(user).toContain("THE EXAMINER'S LINE");
    expect(user).toContain('Де ви зараз живете?');
    expect(user).toContain('A MODEL ANSWER');
    expect(user).toContain('re-decoded by Whisper');
  });

  it('situation: the situation text; no assist → no Whisper block; empty transcript is named', () => {
    const user = buildExamSpeakingMessages({
      task: 'situation',
      promptUk: 'Ви хочете дізнатися, де працює друг.',
      situationUk: 'Ви хочете дізнатися, де працює ваш друг. Запитайте його.',
      transcript: '',
    })[1]!.content;
    expect(user).toContain('THE SITUATION');
    expect(user).toContain('Запитайте його.');
    expect(user).not.toContain('Whisper');
    expect(user).toContain('(nothing recognized)');
  });

  it('photo and monologue render their own three-criterion rubrics; photo shows what the picture holds', () => {
    const photo = buildExamSpeakingMessages({
      task: 'photo',
      promptUk: 'Опишіть фото',
      imageAlt: 'Родина обідає.',
      questionsUk: ['Де вони?'],
      minSentences: 5,
      maxSentences: 7,
      transcript: 'на фото родина',
      level: 'A1',
    });
    for (const c of SPEAKING_RUBRICS.photo) expect(photo[0]!.content).toContain(`"id": "${c.id}"`);
    expect(photo[0]!.content).toContain('task 46');
    expect(photo[1]!.content).toContain('Родина обідає.');
    expect(photo[1]!.content).toContain('Required: 5–7 phrases.');
    const mono = buildExamSpeakingMessages({
      task: 'monologue',
      promptUk: 'Моя родина',
      questionsUk: ['Хто у вашій родині?'],
      transcript: 'у мене родина',
      level: 'B1',
    });
    expect(mono[0]!.content).toContain('task 47');
    expect(mono[0]!.content).toContain('HONEST B1');
    expect(mono[0]!.content).not.toContain('"fullness"');
    expect(mono[1]!.content).toContain('Required: 20–25 phrases.');
  });
});

describe('synthetic speaking fixtures', () => {
  it('three fixtures, all _synthetic, one per speaking case', () => {
    const cases = UK_CAPTURE_CASES.filter((c) => c.kind === 'speaking').map((c) => c.name);
    expect(cases).toHaveLength(3);
    expect(FILES).toHaveLength(3);
    for (const f of FILES) expect(load(f)._synthetic).toBe(true);
  });
  for (const file of FILES) {
    it(`${file}: parses with the rubric ids of its task`, () => {
      const fx = load(file);
      const grade = parseExamGrade(fx.choices[0]!.message.content)!;
      expect(grade).not.toBeNull();
      const kind =
        fx.input.task === 'photo'
          ? 'photo'
          : fx.input.task === 'monologue'
            ? 'monologue'
            : 'dialogue';
      expect(grade.criteria.map((c) => c.id)).toEqual(SPEAKING_RUBRICS[kind].map((c) => c.id));
      expect(grade.criteria.reduce((n, c) => n + c.max, 0)).toBe(100);
      expect(buildExamSpeakingMessages(fx.input)[0]!.content).toContain(`HONEST ${fx.input.level}`);
      expect(/[\u0451\u044b\u044d\u044a]/u.test(grade.corrected ?? '')).toBe(false);
    });
  }
});
