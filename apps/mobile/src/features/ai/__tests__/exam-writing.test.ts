import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { WRITING_RUBRICS, rubricMax } from '../../torfl/grading/rubrics';
import { criteriaPercent } from '../../torfl/grading/writing';
import { UK_CAPTURE_CASES } from '../dev/exam-uk-cases';
import {
  buildExamWritingMessages,
  examWritingSystem,
  type ExamWritingInput,
} from '../prompts/exam-writing';
import { ExamGradeSchema, parseExamGrade } from '../schemas';

/**
 * UT17b: the Ukrainian exam-writing prompt contract + the `_synthetic` fixtures (hand-written; live capture via
 * `/dev-exam-capture` is ready-for-human). Parsed with the production parser; no live call here.
 */
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__');
interface Fixture {
  _synthetic?: boolean;
  input: ExamWritingInput;
  choices: { message: { content: string }; finish_reason: string | null }[];
}
const load = (name: string) =>
  JSON.parse(readFileSync(path.join(FIXTURES, name), 'utf8')) as Fixture;
const WRITING_FILES = readdirSync(FIXTURES).filter((f) => f.startsWith('exam-uk-writing-'));
const CYRILLIC_RU_ONLY = /[\u0451\u044b\u044d\u044a]/u;

describe('exam-writing prompt (Ukrainian examiner)', () => {
  const base = {
    taskUk: 'Напишіть повідомлення другові.',
    bullets: [
      { id: 'b1', uk: 'подякуйте' },
      { id: 'b2', uk: 'скажіть, що прийдете' },
    ],
    minSentences: 3,
    minQuestions: 1,
    maxQuestions: 2,
    minWords: 10,
    maxWords: 25,
    letter: 'Привіт! Дякую.',
    modelLetter: 'Привіт, Оксано! Дякую за запрошення.',
  };

  it('message: system renders the message rubric (Σ 100), the Ukrainian norm and the honest-level line', () => {
    const sys = buildExamWritingMessages({ ...base, taskTopic: 'wr-message' })[0]!.content;
    for (const c of WRITING_RUBRICS.message)
      expect(sys).toContain(`"id": "${c.id}", "score": <0-${c.max}>, "max": ${c.max}`);
    expect(rubricMax(WRITING_RUBRICS.message)).toBe(100);
    expect(sys).toContain('Ukrainian state-language exam');
    expect(sys).toContain('HONEST A1');
    expect(sys).toContain('surzhyk');
    expect(sys).toContain('never call it official grading');
    expect(sys).not.toContain('TORFL');
    expect(sys).not.toContain('"letter-form"');
  });

  it('text: renders the seven-criterion rubric; level changes the standard line', () => {
    const sysB1 = buildExamWritingMessages({ ...base, taskTopic: 'wr-text', level: 'B1' })[0]!
      .content;
    for (const c of WRITING_RUBRICS.text) expect(sysB1).toContain(`"${c.id}"`);
    expect(rubricMax(WRITING_RUBRICS.text)).toBe(100);
    expect(sysB1).toContain('HONEST B1');
    expect(examWritingSystem('A2', 'text')).toContain('HONEST A2');
  });

  it('user carries the task, points, counts, word limits, model text and the candidate text last', () => {
    const user = buildExamWritingMessages({ ...base, taskTopic: 'wr-message' })[1]!.content;
    expect(user).toContain('Напишіть повідомлення другові.');
    expect(user).toContain('1. подякуйте');
    expect(user).toContain('at least 3 sentences');
    expect(user).toContain('1–2 questions');
    expect(user).toContain('Word limit: 10–25 words.');
    expect(user).toContain('A MODEL TEXT');
    expect(user.endsWith('Привіт! Дякую.')).toBe(true);
  });

  it('no model → no calibration block; no quota → «no question quota»', () => {
    const user = buildExamWritingMessages({
      ...base,
      minQuestions: 0,
      maxQuestions: null,
      minWords: null,
      maxWords: null,
      modelLetter: null,
      taskTopic: 'wr-text',
    })[1]!.content;
    expect(user).not.toContain('MODEL TEXT');
    expect(user).toContain('no question quota');
    expect(user).not.toContain('Word limit');
  });
});

describe('ExamGradeSchema', () => {
  const ok = {
    criteria: WRITING_RUBRICS.message.map((c) => ({ id: c.id, score: c.max, max: c.max })),
  };
  it('accepts a full per-kind set; defaults changes/tips', () => {
    const g = ExamGradeSchema.parse(ok);
    expect(g.changes).toEqual([]);
    expect(g.tips).toEqual([]);
  });
  it('refuses score > max, Σ max ≠ 100, duplicate ids', () => {
    expect(
      ExamGradeSchema.safeParse({
        criteria: ok.criteria.map((c, i) => (i === 0 ? { ...c, score: c.max + 1 } : c)),
      }).success,
    ).toBe(false);
    expect(ExamGradeSchema.safeParse({ criteria: ok.criteria.slice(1) }).success).toBe(false);
    expect(
      ExamGradeSchema.safeParse({
        criteria: [...ok.criteria.slice(0, 3), { ...ok.criteria[3]!, id: ok.criteria[0]!.id }],
      }).success,
    ).toBe(false);
  });
  it('parseExamGrade tolerates fences and lead-in prose, returns null on garbage', () => {
    expect(parseExamGrade('```json\n' + JSON.stringify(ok) + '\n```')).not.toBeNull();
    expect(parseExamGrade('Here you go: ' + JSON.stringify(ok))).not.toBeNull();
    expect(parseExamGrade('no json here')).toBeNull();
    expect(parseExamGrade('{"criteria": []}')).toBeNull();
  });
});

describe('synthetic writing fixtures (UT17b, ≥ 6 cases: A1/A2/B1 strong + weak)', () => {
  it('there are six writing fixtures, all marked _synthetic, one per UK_CAPTURE_CASES writing case', () => {
    const cases = UK_CAPTURE_CASES.filter((c) => c.kind === 'writing').map((c) => c.name);
    expect(cases).toHaveLength(6);
    expect(WRITING_FILES).toHaveLength(6);
    for (const f of WRITING_FILES) expect(load(f)._synthetic).toBe(true);
    for (const name of cases) expect(WRITING_FILES.some((f) => f.includes(`-${name}-`))).toBe(true);
  });

  for (const file of WRITING_FILES) {
    it(`${file}: parses with the rubric's ids in order; the prompt is built from the stored input`, () => {
      const fx = load(file);
      expect(fx.choices[0]!.finish_reason).toBe('stop');
      const grade = parseExamGrade(fx.choices[0]!.message.content);
      expect(grade).not.toBeNull();
      const kind = fx.input.taskTopic === 'wr-text' ? 'text' : 'message';
      expect(grade!.criteria.map((c) => c.id)).toEqual(WRITING_RUBRICS[kind].map((c) => c.id));
      expect(grade!.criteria.map((c) => c.max)).toEqual(WRITING_RUBRICS[kind].map((c) => c.max));
      expect(buildExamWritingMessages(fx.input)[0]!.content).toContain(`HONEST ${fx.input.level}`);
      for (const ch of grade!.changes) {
        if (ch.before.length > 0) expect(fx.input.letter).toContain(ch.before);
      }
      // Ukrainian only: no Russian-only letters in any corrected text.
      expect(CYRILLIC_RU_ONLY.test(grade!.corrected ?? '')).toBe(false);
    });
  }

  it('strong outscores weak at every level; weak ones carry corrections', () => {
    const pct = (f: string) =>
      criteriaPercent(parseExamGrade(load(f).choices[0]!.message.content)!.criteria);
    for (const lv of ['a1-message', 'a2-text', 'b1-text']) {
      const strong = WRITING_FILES.find((f) => f.includes(`${lv}-strong`))!;
      const weak = WRITING_FILES.find((f) => f.includes(`${lv}-weak`))!;
      expect(pct(strong)).toBeGreaterThan(pct(weak) + 25);
      expect(
        parseExamGrade(load(weak).choices[0]!.message.content)!.changes.length,
      ).toBeGreaterThan(0);
    }
  });
});
