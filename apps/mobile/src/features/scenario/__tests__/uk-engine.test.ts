import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Slot } from '@sutinki/schema';
import { describe, expect, it } from 'vitest';

import { scoringTokens } from '@/features/pronunciation/scoring';

import { judgeAnswer, type JudgeExpectation } from '../judge/judge';
import {
  contentTokens,
  hasNumeral,
  isNegativeForm,
  isNumeralToken,
  isStopword,
  matchForm,
  matchForms,
  negationMismatch,
  parseUkNumber,
  STOP_UK,
  stemMatches,
  stemVariantsUk,
  UK_NUMERALS,
} from '../judge/slots';
import {
  detectMetaIntent,
  findGlossaryByRu,
  META_TRIGGERS,
  type GlossaryLookupEntry,
} from '../meta-intents';

/**
 * UT14: the Ukrainian scenario engine — meta-intents (decision 3), slot
 * primitives (stopwords, numerals, alternation stems, negation — decisions
 * 4/5) and the judge tie-break «negation first, then option order»
 * (Session log 2026-11-05) against the real USRC005/006 expectations
 * (`fixtures/uk-scenarios-expect.json`, extracted from
 * `Stories/scenarios/<family>/a1-<family>.scenario.uk.md`).
 */

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
interface FamilyTurns {
  id: string;
  expect: JudgeExpectation & { slots: Slot[] };
}
const scripts = JSON.parse(
  readFileSync(path.join(FIXTURES, 'uk-scenarios-expect.json'), 'utf8'),
) as Record<string, FamilyTurns[]>;
/** The first expectation of a family that carries the slot id (stable against turn renumbering). */
function turn(family: string, slotId: string): JudgeExpectation {
  const t = scripts[family]?.find((x) => x.expect.slots.some((s) => s.id === slotId));
  if (!t) throw new Error(`no ${family} turn with slot ${slotId}`);
  return t.expect;
}
const j = (said: string, e: JudgeExpectation) => judgeAnswer(said, e, { language: 'uk' });

describe('meta-intents (uk)', () => {
  it.each([
    ['що значить рахунок', 'explain', 'рахунок'],
    ['Що означає «картка»?', 'explain', 'картка'],
    ['що таке чек', 'explain', 'чек'],
    ['я не розумію слово квитанція', 'explain', 'квитанція'],
    ['не розумію слово колонка', 'explain', 'колонка'],
    ['не зрозумів слово бак', 'explain', 'бак'],
    ['не зрозуміла слово бак', 'explain', 'бак'],
    ['як сказати стомак', 'howtosay', 'стомак'],
    ['як це сказати хедейк', 'howtosay', 'хедейк'],
    ['як буде українською паспорт', 'howtosay', 'паспорт'],
    ['як по-українськи гоутел', 'howtosay', 'гоутел'],
    ['повтори', 'repeat', ''],
    ['повторіть, будь ласка', 'repeat', ''],
    ['ще раз', 'repeat', ''],
    ['що', 'repeat', ''],
    ['а', 'repeat', ''],
    ['повільніше', 'slower', ''],
    ['не так швидко', 'slower', ''],
    ['я не розумію', 'dont-understand', ''],
    ['не розумію', 'dont-understand', ''],
    ['я не зрозумів', 'dont-understand', ''],
    ['я не зрозуміла', 'dont-understand', ''],
  ])('«%s» ⇒ %s, query «%s»', (said, intent, query) => {
    const d = detectMetaIntent(said, 'uk');
    expect(d?.intent).toBe(intent);
    expect(d?.query).toBe(query);
  });

  it('every uk trigger hits itself (and only itself or a longer sibling)', () => {
    for (const t of META_TRIGGERS.uk) {
      const d = detectMetaIntent(t.takesQuery ? `${t.phrase} слово` : t.phrase, 'uk');
      expect(d?.intent, t.phrase).toBe(t.intent);
    }
  });

  it('leading fillers are skipped («ну, будь ласка, повтори»)', () => {
    expect(detectMetaIntent('ну будь ласка повтори', 'uk')?.intent).toBe('repeat');
    expect(detectMetaIntent('вибачте, що значить рахунок', 'uk')).toMatchObject({
      intent: 'explain',
      query: 'рахунок',
    });
    expect(detectMetaIntent('ой повільніше', 'uk')?.intent).toBe('slower');
  });

  it('plain answers are NOT commands', () => {
    for (const said of [
      'мене звуть мітч',
      'добре дякую',
      'я з америки',
      'я люблю читати',
      'ні, не люблю',
      'так',
      'три дні',
      'дев’яносто п’ятий',
    ]) {
      expect(detectMetaIntent(said, 'uk'), said).toBeNull();
    }
  });

  it('one-token «що»/«а» is a command only as the WHOLE transcript', () => {
    expect(detectMetaIntent('що', 'uk')?.intent).toBe('repeat');
    expect(detectMetaIntent('що ви хочете', 'uk')).toBeNull();
    expect(detectMetaIntent('а я не знаю', 'uk')).toBeNull();
  });

  it('«я не розумію слово X» is explain, plain «я не розумію» is dont-understand', () => {
    expect(detectMetaIntent('я не розумію слово бак', 'uk')).toMatchObject({
      intent: 'explain',
      query: 'бак',
    });
    expect(detectMetaIntent('я не розумію', 'uk')?.intent).toBe('dont-understand');
  });

  it('a «що значить» tail inside an answer does not fire (head-anchored)', () => {
    expect(detectMetaIntent('я знаю що значить рахунок', 'uk')).toBeNull();
  });

  it('ASR-shaped triggers still fire', () => {
    expect(detectMetaIntent('що значіть рахунок', 'uk')?.intent).toBe('explain');
    expect(detectMetaIntent('як сказат стомак', 'uk')?.intent).toBe('howtosay');
    expect(detectMetaIntent('повільнішє', 'uk')?.intent).toBe('slower');
  });

  it('the apostrophe fold applies to triggers («по-українськи» hyphen kept)', () => {
    expect(detectMetaIntent('як по-українськи кава', 'uk')?.query).toBe('кава');
  });
});

describe('slots (uk): stopwords, numerals, stems', () => {
  it('STOP_UK holds the decision-5 list; content words are not stopwords', () => {
    for (const w of [
      'я',
      'ти',
      'вона',
      'і',
      'й',
      'та',
      'але',
      'із',
      'зі',
      'що',
      'як',
      'ну',
      'ласка',
    ]) {
      expect(STOP_UK.has(w), w).toBe(true);
    }
    expect(isStopword('Ще', 'uk')).toBe(true);
    expect(isStopword('голова', 'uk')).toBe(false);
    expect(contentTokens(scoringTokens('Ну, е-е, я Мітч, дякую'), 'uk')).toEqual(['мітч']);
    expect(contentTokens(scoringTokens('так ні ну ось'), 'uk')).toEqual([]);
  });

  it('numerals 0–100: cardinal, feminine, oblique, ordinal; digits; exact only', () => {
    for (const w of [
      'нуль',
      'одна',
      'дві',
      'три',
      "п'ять",
      'шість',
      'одинадцять',
      'двадцять',
      'сорок',
      "дев'яносто",
      'сто',
      'третя',
      "п'ята",
      "п'ятий",
    ]) {
      expect(isNumeralToken(w, 'uk'), w).toBe(true);
    }
    expect(isNumeralToken('25', 'uk')).toBe(true);
    expect(isNumeralToken('пʼять', 'uk')).toBe(true); // U+02BC folded
    expect(isNumeralToken('пять', 'uk')).toBe(false);
    expect(isNumeralToken('сім’я', 'uk')).toBe(false); // «сім’я» is not «сім»
    expect(UK_NUMERALS.get('двадцять')).toBe(20);
    expect(hasNumeral(scoringTokens('два дні'), 'uk')).toBe(true);
    expect(hasNumeral(scoringTokens('давно'), 'uk')).toBe(false);
  });

  it('parseUkNumber sums tens + units', () => {
    expect(parseUkNumber(scoringTokens("двадцять п'ять років"))).toBe(25);
    expect(parseUkNumber(scoringTokens("дев'яносто п'ять"))).toBe(95);
    expect(parseUkNumber(scoringTokens('третя'))).toBe(3);
    expect(parseUkNumber(scoringTokens('я тут 7 років'))).toBe(7);
    expect(parseUkNumber(scoringTokens('давно'))).toBeNull();
  });

  it('consonant alternations: рука/руці, нога/нозі, вухо/вусі, мати/матір', () => {
    expect(stemMatches('рук', 'руці', 'uk')).toBe(true); // к → ц
    expect(stemMatches('ног', 'нозі', 'uk')).toBe(true); // г → з
    expect(stemMatches('вух', 'вусі', 'uk')).toBe(true); // х → с
    expect(stemMatches('сторон', 'стороні', 'uk')).toBe(true);
    expect(stemMatches('рук', 'руці', 'ru')).toBe(false); // ru path untouched
    expect(stemMatches('ног', 'нога', 'uk')).toBe(true);
    expect(stemMatches('ног', 'око', 'uk')).toBe(false);
    expect(stemVariantsUk('рук')).toEqual(['рук', 'руц', 'руч']);
    expect(stemVariantsUk('ка')).toEqual(['ка']); // short stems are never expanded
  });

  it('forms run through matchForm with the alternation («рук*» hits «руці», «ног*» «нозі»)', () => {
    expect(matchForm('рук*', scoringTokens('болить у руці'), 'uk')?.at).toBe(2);
    expect(matchForm('ног*', scoringTokens('на нозі'), 'uk')?.at).toBe(1);
    expect(matchForm('ног*', scoringTokens('на нозі'), 'ru')).toBeNull();
    expect(matchForm('голов*', scoringTokens('голова'), 'uk')).not.toBeNull();
  });

  it('the apostrophe is folded on both sides', () => {
    expect(matchForm("п'ят*", scoringTokens('пʼять'), 'uk')).not.toBeNull();
    expect(matchForm("дев'яносто п'ят*", scoringTokens("дев'яносто п’ятий"), 'uk')).not.toBeNull();
    expect(matchForm('комп’ютер*', scoringTokens("комп'ютер"), 'uk')).not.toBeNull();
  });

  it('glossary lookup uses the alternation too', () => {
    const g: GlossaryLookupEntry[] = [
      { id: 'gl-hand', ru: 'рука', en: 'hand', forms: ['рука', 'рук*'], translit: [] },
    ];
    expect(findGlossaryByRu(['руці'], g, 'uk')?.id).toBe('gl-hand');
  });
});

describe('negation (uk)', () => {
  it('the «не»-prefix guard: давно ≠ недавно, добре ≠ недобре, but lexical «небо/неділя» are no negations', () => {
    expect(negationMismatch('давно', 'недавно', 'uk')).toBe(true);
    expect(negationMismatch('добре', 'недобре', 'uk')).toBe(true);
    expect(negationMismatch('велик', 'невеликий', 'uk')).toBe(true);
    expect(negationMismatch('бо', 'небо', 'uk')).toBe(false);
    expect(negationMismatch('діля', 'неділя', 'uk')).toBe(false);
    expect(negationMismatch('щодавно', 'нещодавно', 'uk')).toBe(false);
    expect(negationMismatch('недавно', 'недавна', 'uk')).toBe(false);
  });

  it('forms: «давно» never matches «недавно»; «неділ*» matches «неділя»', () => {
    expect(matchForm('давно', scoringTokens('недавно'), 'uk')).toBeNull();
    expect(matchForm('неділ*', scoringTokens('у неділю'), 'uk')).not.toBeNull();
  });

  it('isNegativeForm: ні / не … / нема / не-prefixed words, not bare positives', () => {
    for (const f of [
      'ні',
      'не люблю',
      'не потрібна',
      'нема',
      'немає',
      'нічого',
      'не сам*',
      'невеликий',
    ])
      expect(isNegativeForm(f), f).toBe(true);
    for (const f of ['так', 'люблю', 'хочу', 'неділя', 'небо'])
      expect(isNegativeForm(f), f).toBe(false);
  });

  it('matchForms: an explicit negative form beats a bare positive token at the same span', () => {
    expect(matchForms(['хочу', 'ні'], scoringTokens('ні, хочу'), 'uk')?.form).toBe('ні');
    // ru path is unchanged: the earlier form keeps a span tie
    expect(matchForms(['хочу', 'ні'], scoringTokens('ні, хочу'), 'ru')?.form).toBe('хочу');
  });
});

describe('judge tie-break (uk): negation first, then option order — USRC005/006 fixtures', () => {
  it('the bank receipt (no listed first): «Ні, не потрібна», «ні, чек не треба» ⇒ no', () => {
    const e = turn('bank', 'receipt');
    expect(j('Ні, не потрібна', e).slots['receipt']).toBe('no');
    expect(j('Ні, чек не треба', e).slots['receipt']).toBe('no');
    expect(j('Так, звичайно', e).slots['receipt']).toBe('yes');
    expect(j('Так, чек', e).slots['receipt']).toBe('yes');
  });

  it('the bank new-card slot: «Ні, не хочу» ⇒ no (the bare «хочу» of yes does not win)', () => {
    const e = turn('bank', 'newcard');
    expect(e.branchOn).toBe('newcard');
    const r = j('Ні, не хочу', e);
    expect(r.slots['newcard']).toBe('no');
    expect(r.branchKey).toBe('no');
    expect(r.verdict).toBe('matched');
    expect(j('Так, хочу', e).branchKey).toBe('yes');
    expect(j('Хочу', e).branchKey).toBe('yes');
    expect(j('Не хочу', e).branchKey).toBe('no');
  });

  it('negation outranks option order even when the positive option is listed FIRST', () => {
    const e: JudgeExpectation = {
      slots: [
        {
          kind: 'forms',
          id: 'like',
          required: true,
          acceptsNumber: false,
          options: [
            { key: 'yes', lemma: 'так', forms: ['так', 'люблю'] },
            { key: 'no', lemma: 'ні', forms: ['ні', 'не дуже'] },
          ],
        },
      ],
      accept: ['Так, люблю.', 'Ні, не люблю.'],
      branchOn: 'like',
    };
    expect(j('Ні, не люблю', e).branchKey).toBe('no');
    expect(j('Не дуже люблю', e).branchKey).toBe('no');
    expect(j('Люблю', e).branchKey).toBe('yes');
  });

  it('when negation is not involved, option order decides a tie', () => {
    const e: JudgeExpectation = {
      slots: [
        {
          kind: 'forms',
          id: 'drink',
          required: true,
          acceptsNumber: false,
          options: [
            { key: 'tea', lemma: 'чай', forms: ['чай*'] },
            { key: 'coffee', lemma: 'кава', forms: ['кав*'] },
          ],
        },
      ],
      accept: ['Чай.'],
    };
    expect(j('кава і чай', e).slots['drink']).toBe('tea');
  });

  it('the doctor «food» slot: «нічого не їв» ⇒ nothing, «не їла» ⇒ nothing, a meal ⇒ meat', () => {
    const e = turn('doctor', 'food');
    expect(j('Нічого не їв', e).slots['food']).toBe('nothing');
    expect(j('Не їла', e).slots['food']).toBe('nothing');
    expect(j('Я їв шашлик', e).slots['food']).toBe('meat');
  });

  it('the doctor «intensity» slot: «Не дуже» ⇒ mild (not strong via «дуже»); «Дуже» ⇒ strong', () => {
    const e = turn('doctor', 'intensity');
    expect(j('Не дуже', e).slots['intensity']).toBe('mild');
    expect(j('Не дуже сильно', e).slots['intensity']).toBe('mild');
    expect(j('Дуже сильно', e).slots['intensity']).toBe('strong');
    expect(j('Сильно', e).slots['intensity']).toBe('strong');
  });

  it('the doctor «meds» and «allergy» slots: «Ні, нічого не приймаю» / «Ні, алергії немає» ⇒ no', () => {
    const meds = turn('doctor', 'meds');
    expect(j('Ні, нічого не приймаю', meds).branchKey).toBe('no');
    expect(j('Так, парацетамол', meds).branchKey).toBe('yes');
    const allergy = turn('doctor', 'allergy');
    expect(j('Ні, алергії немає', allergy).slots['allergy']).toBe('no');
    expect(j('Так, є', allergy).slots['allergy']).toBe('yes');
    // the bare positive «є» next to a negation: «Ні, не є» ⇒ no
    expect(j('Ні, не є', allergy).slots['allergy']).toBe('no');
  });

  it('podcast yes/no: «Ні, не люблю» ⇒ no; «Дуже люблю» ⇒ yes; «Не дуже» ⇒ no', () => {
    const e = turn('podcast', 'yesno');
    expect(j('Ні, не люблю', e).slots['yesno']).toBe('no');
    expect(j('Не дуже люблю', e).slots['yesno']).toBe('no');
    expect(j('Не дуже', e).slots['yesno']).toBe('no');
    expect(j('Дуже люблю', e).slots['yesno']).toBe('yes');
    expect(j('Так, звичайно', e).slots['yesno']).toBe('yes');
  });

  it('nightshift «alone» slot: «ні, не сам» ⇒ no; «так, я сам» ⇒ yes', () => {
    const e = turn('nightshift', 'alone');
    expect(j('Ні, не сам', e).slots['alone']).toBe('no');
    expect(j('Так, я сам', e).slots['alone']).toBe('yes');
    expect(j('Так, не сам', e).slots['alone']).toBe('no');
  });

  it('police «ok»: «Ні, не зрозуміло» ⇒ no; «Зрозуміло» ⇒ yes', () => {
    const e = [...scripts['police']!]
      .reverse()
      .find((t) => t.expect.slots.some((s) => s.id === 'ok'))!.expect;
    expect(j('Ні, не зрозуміло', e).slots['ok']).toBe('no');
    expect(j('Так, зрозуміло', e).slots['ok']).toBe('yes');
  });

  it('gas «milk»: «з молоком» ⇒ with; «без» ⇒ without; number slots take spoken ordinals', () => {
    const milk = turn('gas', 'milk');
    expect(j('З молоком', milk).slots['milk']).toBe('with');
    expect(j('Без молока', milk).slots['milk']).toBe('without');
    const pump = turn('gas', 'pump');
    expect(j('Третя', pump).slots['pump']).toBe('number');
    expect(j('Номер три', pump).slots['pump']).toBe('number');
    expect(j('Колонка п’ята', pump).slots['pump']).toBe('number');
    expect(j('Не знаю', pump).slots['pump']).toBeNull();
  });
});

describe('judge (uk): every USRC expectation matches its own model answer', () => {
  const families = Object.keys(scripts);
  it('has the six families', () => {
    expect(families.sort()).toEqual(['bank', 'doctor', 'gas', 'nightshift', 'podcast', 'police']);
  });
  for (const fam of families) {
    for (const t of scripts[fam]!) {
      it(`${fam}/${t.id}: accept[0] is matched`, () => {
        const model = t.expect.accept[0]!;
        const r = j(model, t.expect);
        expect(r.verdict, `${model} → ${JSON.stringify(r.slots)}`).toBe('matched');
      });
    }
  }

  it('free slot: stopwords never count; a reject word is masked (name slot)', () => {
    const e = turn('podcast', 'name');
    expect(j('Мене звуть Мітч', e).verdict).toBe('matched');
    expect(j('Ну, е-е', e).verdict).toBe('miss');
    expect(j('Добре, дякую', e).rejectIndex).toBe(0);
  });

  it('an empty transcript is no-speech', () => {
    expect(j('', turn('podcast', 'name')).verdict).toBe('no-speech');
  });

  it('the same transcript under ru is untouched by the uk tie-break (regression guard)', () => {
    const e = turn('bank', 'newcard');
    // ru path: span-then-option-order, i.e. the earlier option wins a tie
    const ru = judgeAnswer('ні не хочу', e);
    expect(ru.slots['newcard']).toBe('no'); // the longest form still wins in ru
  });
});
