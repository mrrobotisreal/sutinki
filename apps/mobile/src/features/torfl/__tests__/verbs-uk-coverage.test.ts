import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { gradeMonologueOffline, looksLikeVerb, countVerbs } from '../grading/speaking';
import { GENERATED_VERB_FORMS } from '../grading/verbs-uk.generated';
import { MODEL_ANSWERS, type ModelAnswer } from './helpers/model-answers-uk';

/** UISS-010: the generated verb forms + the model-answer corpus (≥ 90 % offline) + the noun-rejection corpus. */

function grade(m: ModelAnswer) {
  return gradeMonologueOffline(
    {
      questions: m.questions,
      minSentences: m.minSentences,
      image: m.photo ? ({} as never) : undefined,
    } as never,
    { transcript: m.text } as never,
  );
}

describe('generated verb forms', () => {
  it('cover the forms UEX009 found missing', () => {
    const missing = [
      'чекають',
      'тримають',
      'дивляться',
      'їде',
      'розмовляють',
      'відправляється',
      'прилетимо',
      'фотографують',
      'вчуся',
      'вчиться',
      'народився',
      'бачили',
      'поїдемо',
      'сидить',
      'стоять',
      'вставай',
      'ідіть',
    ].filter((v) => !looksLikeVerb(v));
    expect(missing).toEqual([]);
  });

  it('every present/past/future/infinitive paradigm of a few core lemmas is recognised', () => {
    const forms = [
      ...[
        'працюю',
        'працюєш',
        'працює',
        'працюємо',
        'працюєте',
        'працюють',
        'працював',
        'працювала',
        'працювати',
      ],
      ...['роблю', 'робиш', 'робить', 'робимо', 'робите', 'роблять', 'робила', 'робили', 'роби'],
      ...['мию', 'миєш', 'мити', 'миються', 'вмиваюся', 'вмивається', 'прокидаються', 'прокинувся'],
      ...['пишу', 'пишеш', 'пишуть', 'писав', 'писала', 'пиши', 'їм', 'їси', 'їдять', 'їв', 'їла'],
    ];
    expect(forms.filter((f) => !looksLikeVerb(f))).toEqual([]);
  });

  it('is non-trivial and contains no common noun', () => {
    expect(GENERATED_VERB_FORMS.size).toBeGreaterThan(3000);
    const nouns = [
      'вечеря',
      'обід',
      'сніданок',
      'гра',
      'кава',
      'вода',
      'мама',
      'тато',
      'кіт',
      'дім',
      'вікно',
      'стіл',
      'книга',
      'школа',
      'вулиця',
      'місто',
      'країна',
      'робота',
      'їжа',
      'пиво',
      'мова',
      'ім’я',
      'друг',
      'подорож',
      'танець',
      'пісня',
      'прання',
      'прибирання',
      'малюнок',
      'польоти',
      'політ',
      'бар',
      'ріка',
      'ліс',
      'море',
      'сонце',
      'небо',
      'парк',
      'ринок',
      'площа',
      'квиток',
      'потяг',
      'вокзал',
    ];
    expect(nouns.filter((n) => GENERATED_VERB_FORMS.has(n))).toEqual([]);
    expect(nouns.filter((n) => looksLikeVerb(n))).toEqual([]);
  });

  it('counts verbless predicate clauses once', () => {
    expect(countVerbs(['тут', 'тепло', 'й', 'сонячно'])).toBe(1);
    expect(countVerbs(['це', 'ринок'])).toBe(1);
    expect(countVerbs(['мама', 'тато'])).toBe(0);
  });
});

describe('model-answer corpus scores ≥ 90 % offline', () => {
  it.each(MODEL_ANSWERS.map((m, i) => [`${m.pack}/${m.id}#${i}`, m] as const))('%s', (_n, m) => {
    expect(grade(m).pct).toBeGreaterThanOrEqual(90);
  });

  // The full 20 answers live in the workspace pack builds (they carry personal details, so they are not
  // committed here); when the workspace is present, check every one of them too.
  const root = findWorkspace();
  const packs = ['a1-ukrexam-writing-speaking-001', 'a1-ukrexam-mock-000', 'a1-ukrexam-mock-001'];
  it.runIf(root !== null)('every staged exam pack model answer (workspace)', () => {
    const low: string[] = [];
    let n = 0;
    for (const p of packs) {
      const file = join(root!, 'Stories/_build', p, 'pack.json');
      if (!existsSync(file)) continue;
      const pack = JSON.parse(readFileSync(file, 'utf8')) as {
        stories: { id: string; sentences: { uk: string }[] }[];
        exams: { subtests: { parts: { items: Record<string, unknown>[] }[] }[] }[];
      };
      const story = new Map(pack.stories.map((s) => [s.id, s]));
      for (const e of pack.exams)
        for (const st of e.subtests)
          for (const part of st.parts)
            for (const it of part.items) {
              if (it['kind'] !== 'speaking-monologue') continue;
              const s = story.get((it['model'] as { storyId: string }).storyId)!;
              const g = gradeMonologueOffline(
                it as never,
                { transcript: s.sentences.map((x) => x.uk).join(' ') } as never,
              );
              n += 1;
              if (g.pct < 90) low.push(`${p}/${String(it['id'])} ${g.pct}`);
            }
    }
    expect(n).toBeGreaterThan(0);
    expect(low).toEqual([]);
  });
});

function findWorkspace(): string | null {
  let dir = __dirname;
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, 'Stories/_build')) && existsSync(join(dir, 'sutinki-content')))
      return dir;
    dir = join(dir, '..');
  }
  return null;
}
