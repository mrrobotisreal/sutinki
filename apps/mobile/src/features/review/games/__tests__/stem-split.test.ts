import { describe, expect, it } from 'vitest';

import adjFixture from '@/features/ai/__tests__/__fixtures__/word-profile-adj.json';
import nounFixture from '@/features/ai/__tests__/__fixtures__/word-profile-noun.json';
import nounFemFixture from '@/features/ai/__tests__/__fixtures__/word-profile-noun-fem.json';
import { WordProfileSchema, type WordProfile } from '@/features/word-forms/profile-schema';

import {
  caseFromGrammar,
  endingFor,
  endingMatches,
  endingVariantFor,
  stemSplit,
} from '../cloze/stem-split';

/** UT20 — pure case-ending split + eligibility (Ukrainian incl. vocative; one Russian regression). */

function fromFixture(f: unknown): WordProfile {
  const content = (f as { choices: { message: { content: string } }[] }).choices[0]!.message
    .content;
  return WordProfileSchema.parse(JSON.parse(content));
}

const CASES_UK = ['Nom.', 'Gen.', 'Dat.', 'Acc.', 'Instr.', 'Loc.', 'Voc.'];
const CASES_RU = ['Nom.', 'Gen.', 'Dat.', 'Acc.', 'Ins.', 'Prep.'];

/** Build a noun profile from [sg[], pl[]] rows; null/'' = empty cell. */
function nounProfile(
  language: 'uk' | 'ru',
  rows: (string | null)[][],
  id = 'noun-declension',
): WordProfile {
  const labels = language === 'uk' ? CASES_UK : CASES_RU;
  return {
    v: 1,
    language,
    kind: 'word',
    pos: 'noun',
    headword: { ru: rows[0]![0]!, plain: rows[0]![0]! },
    overview: { gloss: 'x', facts: [], notes: [] },
    sections: [
      {
        id,
        title: { en: 'Declension', ru: 'Відмінювання' },
        layout: 'grid',
        grid: {
          rowLabels: labels.slice(0, rows.length),
          colLabels: ['Singular', 'Plural'],
          cells: rows.map((r) => r.map((c) => (c ? { ru: c, plain: c } : null))),
        },
      },
    ],
  } as WordProfile;
}

const RUKA = nounProfile('uk', [
  ['рука', 'руки'],
  ['руки', 'рук'],
  ['руці', 'рукам'],
  ['руку', 'руки'],
  ['рукою', 'руками'],
  ['руці', 'руках'],
  ['руко', 'руки'],
]);

describe('stemSplit', () => {
  it('splits a regular feminine hard noun (вода)', () => {
    const r = stemSplit(['вода', 'води', 'воді', 'воду', 'водою', 'воді', 'водо', 'води', 'вод']);
    expect(r?.stem).toBe('вод');
    expect(r?.endings).toEqual(['а', 'и', 'і', 'у', 'ою', 'і', 'о', 'и', '']);
  });
  it('lets an alternation into the ending (рука / руці, нога / нозі)', () => {
    expect(stemSplit(['рука', 'руки', 'руці', 'руку'])?.stem).toBe('ру');
    expect(stemSplit(['нога', 'ноги', 'нозі', 'ногу'])?.stem).toBe('но');
  });
  it('fleeting vowel: сон / сну keeps a 1-letter stem -> fallback; день / дня too', () => {
    expect(stemSplit(['сон', 'сну', 'сну', 'сном'])).toBeNull();
    expect(stemSplit(['день', 'дня', 'дню'])).toBeNull();
  });
  it('closed-syllable о/і (стіл / столу): stem «ст»', () => {
    expect(stemSplit(['стіл', 'стола', 'столу', 'столом'])?.stem).toBe('ст');
  });
  it('soft stem (земля) and neuter (село)', () => {
    expect(stemSplit(['земля', 'землі', 'землю', 'землею'])?.stem).toBe('земл');
    expect(stemSplit(['село', 'села', 'селу', 'селом', 'селі'])?.stem).toBe('сел');
  });
  it('suppletive (я / мене) -> fallback; indeclinable (кафе) -> null', () => {
    expect(stemSplit(['я', 'мене', 'мені', 'мною'])).toBeNull();
    expect(stemSplit(['кафе', 'кафе', 'кафе'])).toBeNull();
  });
  it("apostrophe word (сім'я / сім'ї): variants are one letter", () => {
    const r = stemSplit(["сім'я", 'сімʼї', "сім'ю"]);
    expect(r?.stem).toBe("сім'");
    expect(r?.endings).toEqual(['я', 'ї', 'ю']);
  });
  it('ґ word (ґанок): ґ and г fold together', () => {
    expect(stemSplit(['ґанок', 'ганку', 'ґанку'])?.stem).toBe('ґан');
  });
  it('ї-initial (їжа / їжі)', () => {
    expect(stemSplit(['їжа', 'їжі', 'їжу'])?.stem).toBe('їж');
  });
});

describe('endingFor', () => {
  it('returns the ending tolerant of stress, case, apostrophe, ґ', () => {
    expect(endingFor('Рука\u0301', 'ру')).toBe('ка');
    expect(endingFor('Руко\u0301ю', 'ру')).toBe('кою');
    expect(endingFor('Сімʼї', "сім'")).toBe('ї');
    expect(endingFor('ганку', 'ґан')).toBe('ку');
    expect(endingFor('вода', 'ст')).toBeNull();
  });
});

describe('caseFromGrammar', () => {
  it('reads the case outside parentheses', () => {
    expect(caseFromGrammar('f.sg. voc. (address)')).toBe('voc');
    expect(caseFromGrammar('m.sg. acc. (animate = gen.)')).toBe('acc');
    expect(caseFromGrammar('m.sg. nom.')).toBe('nom');
    expect(caseFromGrammar('1sg. pres.')).toBeNull();
    expect(caseFromGrammar(null)).toBeNull();
  });
});

describe('endingVariantFor (captured fixtures)', () => {
  const stil = fromFixture(nounFixture);
  const mama = fromFixture(nounFemFixture);
  const dobryi = fromFixture(adjFixture);

  it('стіл: «за столом» -> stem «ст», ending «олом», Instr.', () => {
    const v = endingVariantFor({ text: 'столом' }, stil);
    expect(v).toMatchObject({ stem: 'ст', endings: ['олом'], caseSlug: 'instr', pos: 'noun' });
    expect(v?.blankLength).toBeGreaterThanOrEqual(4);
  });
  it('стіл: nominative surface is syncretic with accusative -> needs the grammar note', () => {
    expect(endingVariantFor({ text: 'стіл' }, stil)).toBeNull();
    expect(endingVariantFor({ text: 'стіл', grammar: 'm.sg. acc.' }, stil)?.caseSlug).toBe('acc');
    expect(endingVariantFor({ text: 'стіл', grammar: 'm.sg. nom.' }, stil)?.caseSlug).toBe('nom');
  });
  it('мама: vocative «Мамо!» is served as the Voc. row; ending «о»', () => {
    const v = endingVariantFor({ text: 'Мамо', grammar: 'f.sg. voc. (address)' }, mama);
    expect(v).toMatchObject({ stem: 'Мам', endings: ['о'], caseSlug: 'voc', caseIndex: 6 });
  });
  it('мама: plural voc = nominative cell -> not a vocative item (row skipped)', () => {
    // «мами» is Nom.pl, Gen.sg, Voc.pl... voc is dropped, so a voc note finds nothing
    expect(endingVariantFor({ text: 'мами', grammar: 'f.pl. voc.' }, mama)).toBeNull();
  });
  it('мама: syncretic «мами» without a note is ineligible; with gen. note it works', () => {
    expect(endingVariantFor({ text: 'мами' }, mama)).toBeNull();
    expect(endingVariantFor({ text: 'мами', grammar: 'f.sg. gen.' }, mama)?.caseSlug).toBe('gen');
  });
  it('добрий: «доброго» + gen. note; accepts alternatives for the animate accusative', () => {
    const gen = endingVariantFor({ text: 'доброго', grammar: 'm.sg. gen.' }, dobryi);
    expect(gen).toMatchObject({ stem: 'добр', endings: ['ого'], caseSlug: 'gen', pos: 'adj' });
    const acc = endingVariantFor({ text: 'доброго', grammar: 'm.sg. acc. (animate)' }, dobryi);
    expect(acc?.caseSlug).toBe('acc');
    expect(acc?.endings).toEqual(['ого', 'ий']);
    expect(endingMatches(acc!, 'ий')).toBe(true);
  });
  it('добрий: adjective vocative = nominative -> no vocative item', () => {
    expect(endingVariantFor({ text: 'добрий', grammar: 'm.sg. voc.' }, dobryi)).toBeNull();
  });
  it('unlisted surface and non-grid profiles fall back (null)', () => {
    expect(endingVariantFor({ text: 'столець' }, stil)).toBeNull();
    const phrase = { ...stil, sections: stil.sections.filter((s) => s.id !== 'noun-declension') };
    expect(endingVariantFor({ text: 'столом' }, phrase)).toBeNull();
  });
});

describe('endingVariantFor (hand grids)', () => {
  it('рука / руці: alternation flagged, ending «ці»', () => {
    const v = endingVariantFor({ text: 'руці', grammar: 'f.sg. dat.' }, RUKA);
    expect(v).toMatchObject({ stem: 'ру', endings: ['ці'], alternation: true, caseSlug: 'dat' });
    expect(endingVariantFor({ text: 'руки', grammar: 'f.sg. gen.' }, RUKA)?.alternation).toBe(
      false,
    );
  });
  it('indeclinable кафе -> ineligible', () => {
    const kafe = nounProfile('uk', [
      ['кафе', 'кафе'],
      ['кафе', 'кафе'],
      ['кафе', 'кафе'],
    ]);
    expect(endingVariantFor({ text: 'кафе' }, kafe)).toBeNull();
  });
  it('plural column with different stem: дитина / діти falls back to the column', () => {
    const dytyna = nounProfile('uk', [
      ['дитина', 'діти'],
      ['дитини', 'дітей'],
      ['дитині', 'дітям'],
      ['дитину', 'дітей'],
      ['дитиною', 'дітьми'],
      ['дитині', 'дітях'],
      ['дитино', 'діти'],
    ]);
    const sg = endingVariantFor({ text: 'дитиною', grammar: 'f.sg. instr.' }, dytyna);
    expect(sg).toMatchObject({ stem: 'дитин', endings: ['ою'] });
    const pl = endingVariantFor({ text: 'дітьми', grammar: 'pl. instr.' }, dytyna);
    expect(pl).toMatchObject({ stem: 'діт', endings: ['ьми'] });
  });
  it("apostrophe word: сім'ї with the authored apostrophe kept in the stem", () => {
    const sim = nounProfile('uk', [
      ["сім'я", "сім'ї"],
      ["сім'ї", "сім'ям"],
      ["сім'ї", "сім'ям"],
    ]);
    const v = endingVariantFor({ text: 'сімʼї', grammar: 'f.sg. gen.' }, sim);
    expect(v?.stem).toBe('сімʼ');
    expect(v?.endings).toEqual(['ї']);
  });
  it('typed matcher: tolerant of apostrophe/ґ/stress, strict on letters (і vs и)', () => {
    const v = endingVariantFor({ text: 'столі', grammar: 'm.sg. loc.' }, fromFixture(nounFixture))!;
    expect(endingMatches(v, 'олі')).toBe(true);
    expect(endingMatches(v, 'ст́олі')).toBe(true); // whole word typed
    expect(endingMatches(v, 'оли')).toBe(false);
  });
  it('Russian regression: окно / окон, six cases, no vocative row', () => {
    const okno = nounProfile('ru', [
      ['окно', 'окна'],
      ['окна', 'окон'],
      ['окну', 'окнам'],
      ['окно', 'окна'],
      ['окном', 'окнами'],
      ['окне', 'окнах'],
    ]);
    const v = endingVariantFor({ text: 'окне', grammar: undefined }, okno, 'ru');
    expect(v).toMatchObject({ stem: 'ок', endings: ['не'], caseSlug: 'loc', caseIndex: 5 });
    expect(endingVariantFor({ text: 'окон' }, okno, 'ru')).toMatchObject({
      stem: 'ок',
      endings: ['он'],
    });
    expect(stemSplit(['ребёнок', 'дети'], 'ru')).toBeNull();
    // ё/е tolerance
    expect(endingFor('моё', 'мо', 'ru')).toBe('ё'); // intentional: Russian input
  });
});
