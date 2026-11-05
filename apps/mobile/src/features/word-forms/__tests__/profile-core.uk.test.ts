import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { buildGrammarLessonSystem } from '@/features/ai/prompts/grammar-lesson';
import { buildWordProfileSystem } from '@/features/ai/prompts/word-profile';
import { extractJsonObject } from '@/features/ai/schemas';

import {
  CASES,
  FORM_CHARS_UK,
  GENDERS_UK,
  PERSONS_UK,
  SECTION_CATALOG_UK,
  SECTION_CATALOG,
  catalogFor,
  fixedRowLabels,
  getCatalogEntry,
  profileKeyFor,
  renderCatalogForPrompt,
  requiredSectionIds,
  validateProfile,
} from '../profile-core';
import { WordProfileSchema, type WordProfile } from '../profile-schema';
import { cell, row } from './fixtures';

/**
 * UT13 — the Ukrainian catalog, validator and prompts. Additive to Sumrak's
 * profile-core.test.ts (which keeps pinning the Russian catalog for UP merges).
 */

const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../ai/__tests__/__fixtures__',
);
function loadProfile(name: string): WordProfile {
  const fx = JSON.parse(readFileSync(path.join(FIXTURES, name), 'utf8')) as {
    choices: { message: { content: string } }[];
  };
  return WordProfileSchema.parse(extractJsonObject(fx.choices[0]!.message.content));
}

const noun = () => loadProfile('word-profile-noun.json');
const adj = () => loadProfile('word-profile-adj.json');
const verb = () => loadProfile('word-profile-verb.json');
const phrase = () => loadProfile('word-profile-phrase.json');

describe('Ukrainian catalog (UT13)', () => {
  it('has the same 23 ids in the same order as the Russian catalog', () => {
    expect(SECTION_CATALOG_UK.map((e) => e.id)).toEqual(SECTION_CATALOG.map((e) => e.id));
    expect(catalogFor('uk')).toBe(SECTION_CATALOG_UK);
    expect(catalogFor('ru')).toBe(SECTION_CATALOG);
  });

  it('fixed labels: seven cases with the vocative, ти/ви persons, він/вона genders', () => {
    expect(CASES.uk).toHaveLength(7);
    expect(CASES.uk[4]).toBe('Instr. — орудний');
    expect(CASES.uk[5]).toBe('Loc. — місцевий');
    expect(CASES.uk[6]).toBe('Voc. — кличний');
    expect(PERSONS_UK).toEqual(['я', 'ти', 'він / вона / воно', 'ми', 'ви', 'вони']);
    expect(GENDERS_UK).toEqual(['masc. (він)', 'fem. (вона)', 'neut. (воно)', 'pl. (вони)']);
    for (const id of ['noun-declension', 'adj-long', 'pron-declension', 'name-declension']) {
      expect(fixedRowLabels(getCatalogEntry(id, 'uk')!, 'uk')).toBe(CASES.uk);
    }
    expect(fixedRowLabels(getCatalogEntry('verb-nonpast', 'uk')!, 'uk')).toBe(PERSONS_UK);
    expect(fixedRowLabels(getCatalogEntry('verb-past', 'uk')!, 'uk')).toBe(GENDERS_UK);
    expect(fixedRowLabels(getCatalogEntry('verb-imperative', 'uk')!, 'uk')).toEqual(['ти', 'ви']);
  });

  it('required sections: participles, gerunds and short forms are optional', () => {
    expect(requiredSectionIds('verb', 'uk')).toEqual([
      'verb-nonpast',
      'verb-past',
      'verb-imperative',
      'verb-family',
      'verb-government',
    ]);
    expect(requiredSectionIds('adj', 'uk')).toEqual(['adj-long', 'adj-comparison']);
    expect(requiredSectionIds('noun', 'uk')).toEqual(['noun-declension', 'noun-family']);
    expect(requiredSectionIds('phrase', 'uk')).toEqual(['phrase-structure', 'phrase-usage']);
    // The Russian default is untouched (upstream tests).
    expect(requiredSectionIds('adj')).toContain('adj-short');
  });

  it('titles are Ukrainian values under the `ru` key', () => {
    expect(getCatalogEntry('noun-declension', 'uk')!.title).toEqual({
      en: 'Declension',
      ru: 'Відмінювання',
    });
    expect(getCatalogEntry('verb-nonpast', 'uk')!.title.ru).toBe('Теперішній і майбутній час');
    expect(getCatalogEntry('verb-gerunds', 'uk')!.title.ru).toBe('Дієприслівники');
  });

  it('catalog titles/rules carry no Russian-only letters', () => {
    const text = JSON.stringify(SECTION_CATALOG_UK) + CASES.uk.join('');
    expect(text).not.toMatch(/[ыэъёЫЭЪЁ]/); // intentional: Russian input guard
  });

  it('render golden: key Ukrainian lines of the prompt catalog', () => {
    const lines = renderCatalogForPrompt('uk').split('\n');
    expect(lines).toHaveLength(SECTION_CATALOG_UK.length);
    expect(lines[0]).toContain('id "verb-nonpast"');
    expect(lines[0]).toContain('["я", "ти", "він / вона / воно", "ми", "ви", "вони"]');
    expect(lines[0]).toContain('colLabels ["Present", "Future"]');
    expect(lines[1]).toContain('["masc. (він)", "fem. (вона)", "neut. (воно)", "pl. (вони)"]');
    expect(lines[1]).toContain('Conditional (б / би)');
    expect(lines[2]).toContain('rowLabels FIXED ["ти", "ви"]');
    expect(lines[3]).toContain('optional');
    const nounLine = lines.find((l) => l.includes('id "noun-declension"'))!;
    expect(nounLine).toContain(
      'rowLabels FIXED ["Nom. — називний", "Gen. — родовий", "Dat. — давальний", "Acc. — знахідний", "Instr. — орудний", "Loc. — місцевий", "Voc. — кличний"]',
    );
    expect(nounLine).toContain('required for noun');
    expect(lines.find((l) => l.includes('id "verb-family"'))).toContain('uni');
    expect(lines.find((l) => l.includes('id "pron-declension"'))).toContain('н- prefix');
  });
});

describe('Ukrainian validator (UT13)', () => {
  it('the four fixtures validate with zero issues (hand-authored, see _synthetic)', () => {
    for (const p of [noun(), adj(), verb(), phrase()]) {
      expect(p.language).toBe('uk');
      const r = validateProfile(p);
      expect(r.issues).toEqual([]);
    }
  });

  it('noun grid: 7 case rows including the vocative are required', () => {
    const p = noun();
    const g = p.sections[0]!.grid!;
    g.rowLabels = g.rowLabels.slice(0, 6);
    g.cells = g.cells.slice(0, 6);
    const r = validateProfile(p);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.includes('rowLabels: must be exactly'))).toBe(true);
  });

  it('the Russian six-case labels are rejected for a Ukrainian profile', () => {
    const p = noun();
    p.sections[0]!.grid!.rowLabels = [
      'Nom. — именительный',
      'Gen. — родительный',
      'Dat. — дательный',
      'Acc. — винительный',
      'Ins. — творительный',
      'Prep. — предложный',
      'Voc. — кличний',
    ];
    expect(validateProfile(p).ok).toBe(false);
  });

  it('adjective vocative: repeating the nominative or null both pass', () => {
    const a = adj();
    expect(validateProfile(a).ok).toBe(true);
    a.sections[0]!.grid!.cells[6] = [null, null, null, null];
    expect(validateProfile(a).issues).toEqual([]);
  });

  it('russism guard: ы / э / ъ / ё in a plain form fail', () => {
    for (const bad of ['столы', 'этот', 'объект', 'ёж']) {
      const p = noun();
      p.sections[0]!.grid!.cells[0]![0] = cell(bad);
      const r = validateProfile(p);
      expect(r.ok, bad).toBe(false);
      expect(r.issues.join('\n')).toContain('Russian-only letter');
    }
  });

  it('apostrophes (all three variants) and ґ are accepted in forms', () => {
    for (const form of ["п'ять", 'пʼять', 'п’ять', "м'я́со", 'ґа́нок']) {
      expect(FORM_CHARS_UK.test(form.replaceAll('́', '')), form).toBe(true);
    }
    const p = noun();
    p.headword = { ru: "м'я́со", plain: "м'ясо" };
    expect(validateProfile(p).issues).toEqual([]);
    p.headword = { ru: 'ґа́нок', plain: 'ганок'.replace('г', 'ґ') };
    expect(validateProfile(p).issues).toEqual([]);
  });

  it('Latin letters and digits in a form still fail', () => {
    const p = noun();
    p.sections[0]!.grid!.cells[0]![0] = cell('stіл');
    expect(validateProfile(p).ok).toBe(false);
  });

  it('rule 6 uses the Ukrainian vowel set: є і ї count, stress-less polysyllables warn', () => {
    const p = noun();
    p.sections[1]!.rows = [row('їжа', 'food'), row('кіт', 'cat'), row('вода́', 'water')];
    const r = validateProfile(p);
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.includes('"їжа"') && w.includes('2 vowels'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('"кіт"'))).toBe(false); // monosyllable
    expect(r.warnings.some((w) => w.includes('"вода́"'))).toBe(false);
    // ё is NOT an exemption for Ukrainian, and є-only monosyllables do not warn.
    const q = noun();
    q.sections[1]!.rows = [row('є', 'is')];
    expect(validateProfile(q).warnings).toEqual([]);
  });

  it('verb: missing required section fails; absent participles/gerunds do not', () => {
    const p = verb();
    expect(p.sections.some((s) => s.id === 'verb-participles')).toBe(false);
    expect(validateProfile(p).ok).toBe(true);
    p.sections = p.sections.filter((s) => s.id !== 'verb-imperative');
    const r = validateProfile(p);
    expect(r.issues).toContain(
      'sections: required section "verb-imperative" for pos "verb" is missing',
    );
  });

  it('verb persons must be ти/ви style, not ты/вы', () => {
    const p = verb();
    p.sections[0]!.grid!.rowLabels = ['я', 'ты', 'он / она / оно', 'мы', 'вы', 'они'];
    expect(validateProfile(p).ok).toBe(false);
  });

  it('motion-verb family: unidirectional/multidirectional partner rows validate (<= 14 rows)', () => {
    const p = verb();
    const fam = p.sections.find((s) => s.id === 'verb-family')!;
    fam.rows = [
      row('ходи́ти', 'to go on foot, repeatedly', { tags: ['partner', 'multi'] }),
      row('піти́', 'to set off (completed)', { tags: ['pf', 'prefix:по-'] }),
      row('прийти́', 'to arrive on foot', { tags: ['pf', 'prefix:при-'] }),
    ];
    expect(validateProfile(p).issues).toEqual([]);
    fam.rows = Array.from({ length: 15 }, (_, i) => row('ходи́ти', `g${i}`));
    expect(validateProfile(p).issues.join('\n')).toContain('at most 14 rows');
  });

  it('optional participle section may be present with nulls and still validates', () => {
    const p = verb();
    const gi = p.sections.findIndex((s) => s.id === 'verb-gerunds'); // catalog order: participles before gerunds
    p.sections.splice(gi, 0, {
      id: 'verb-participles',
      title: { en: 'Participles', ru: 'Дієприкметники' },
      layout: 'grid',
      grid: {
        rowLabels: ['Active present', 'Active past', 'Passive (-ний / -тий)'],
        colLabels: ['Form'],
        cells: [[null], [null], [cell('сказа́ний')]],
      },
    });
    expect(validateProfile(p).issues).toEqual([]);
  });

  it('non-NFC input fails for Ukrainian too', () => {
    const p = noun();
    p.sections[0]!.grid!.cells[0]![0] = { ru: 'й', plain: 'й' }; // и + U+0306 (decomposed й)
    expect(validateProfile(p).issues.some((i) => i.includes('not NFC'))).toBe(true);
  });
});

describe('Ukrainian profile key', () => {
  it('apostrophe and ґ words key through lemmaNorm unchanged', () => {
    expect(profileKeyFor({ kind: 'word', lemmaNorm: "п'ять", normalized: "п'ять" })).toEqual({
      lemmaNorm: "п'ять",
      kind: 'word',
    });
    expect(profileKeyFor({ kind: 'word', lemmaNorm: 'ґанок', normalized: 'ґанок' })).toEqual({
      lemmaNorm: 'ґанок',
      kind: 'word',
    });
    expect(profileKeyFor({ kind: 'word', lemmaNorm: null, normalized: "м'ясо" })).toBeNull();
  });
});

describe('Ukrainian prompts (UT13)', () => {
  const system = buildWordProfileSystem('uk');

  it('system prompt: Ukrainian slots, hard rule 9, catalog block, no unresolved slots', () => {
    expect(system).not.toMatch(/\{[A-Z_]+\}/);
    expect(system.startsWith('You are an expert Ukrainian morphologist')).toBe(true);
    expect(system).toContain('"language": "uk"');
    expect(system).toContain('(чита́ти, вода́)');
    expect(system).toContain('the vowels are а е є и і ї о у ю я');
    expect(system).toContain('9. Use standard literary Ukrainian (Український правопис 2019).');
    expect(system).toContain('if a form exists only in Russian, put null');
    expect(system).toContain('conjugation class (I -еш/-єш, II -иш/-їш, irregular)');
    expect(system).toContain('motion verb (unidirectional / multidirectional)');
    expect(system).toContain('vocative formation');
    expect(system.split('Section catalog (FIXED labels must be copied verbatim):\n')[1]).toBe(
      renderCatalogForPrompt('uk'),
    );
    // Russian-specific instructions do not leak into the Ukrainian prompt.
    expect(system).not.toContain('Preserve ё');
    expect(system).not.toContain('short-form availability');
  });

  it('Russian prompt keeps its text (merge compatibility) and has no rule 9', () => {
    const ru = buildWordProfileSystem('ru');
    expect(ru).toContain('Preserve ё wherever it belongs.');
    expect(ru).not.toContain('9. Use standard literary');
    expect(ru).toContain('(говори́ть)');
  });

  it('lesson prompt: Ukrainian spelling note and transfer-trap instruction', () => {
    const lesson = buildGrammarLessonSystem('uk', 'Declension', 'стіл');
    expect(lesson).toContain('precise Ukrainian tutor');
    expect(lesson).toContain('Cyrillic NFC with ґ, ї, є, і and the apostrophe preserved;');
    expect(lesson).toContain('Teach standard literary Ukrainian only');
    expect(lesson).toContain(
      'nominative, genitive, dative, accusative, instrumental, locative, vocative',
    );
    expect(lesson).not.toMatch(/\{[A-Z_]+\}/);
    expect(lesson).toContain('«стіл»');
    const ru = buildGrammarLessonSystem('ru', 'Declension', 'окно');
    expect(ru).toContain('Cyrillic NFC with ё preserved;');
    expect(ru).not.toContain('Teach standard literary Ukrainian');
  });
});
