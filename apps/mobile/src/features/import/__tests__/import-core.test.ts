import { describe, expect, it } from 'vitest';

import {
  buildImportedPackId,
  IMPORT_CHAR_CAP,
  normalizeIntakeText,
  planImportSplit,
  slugify,
  splitSentences,
  suggestTitle,
} from '../import-core';

describe('normalizeIntakeText', () => {
  it('NFC-normalizes decomposed input and preserves ї and the apostrophe', () => {
    // 'ї' as і + combining diaeresis (decomposed — what chat apps produce)
    const decomposed = 'Ще оди́н темний вечір, її п\u2019ять котів';
    const out = normalizeIntakeText(decomposed);
    expect(out).toBe(decomposed.normalize('NFC'));
    expect(out).toContain('ї');
    expect(out).toContain('п\u2019ять');
    expect(normalizeIntakeText("Сім'я")).toBe("Сім'я");
  });

  it('strips BOM/zero-width chars and unifies newlines', () => {
    expect(normalizeIntakeText('﻿Привіт​, світе\r\nДруга')).toBe('Привіт, світе\nДруга');
  });
});

describe('splitSentences', () => {
  it('splits on terminal punctuation keeping closers attached', () => {
    expect(splitSentences('Привіт. Як справи? «Добре!» Гаразд…')).toEqual([
      'Привіт.',
      'Як справи?',
      '«Добре!»',
      'Гаразд…',
    ]);
  });

  it('treats paragraphs as boundaries and collapses inner whitespace', () => {
    expect(splitSentences('Перший рядок без крапки\nДругий  рядок')).toEqual([
      'Перший рядок без крапки',
      'Другий рядок',
    ]);
  });

  // T29: abbreviation awareness (heuristic — review's merge/split is the escape hatch)
  it('does not split after leading abbreviations or single-letter initials', () => {
    expect(splitSentences('Ми живемо на вул. Шевченка. Там тихо.')).toEqual([
      'Ми живемо на вул. Шевченка.',
      'Там тихо.',
    ]);
    expect(splitSentences('Т. Г. Шевченко народився в Моринцях. Потім він поїхав.')).toEqual([
      'Т. Г. Шевченко народився в Моринцях.',
      'Потім він поїхав.',
    ]);
    expect(splitSentences("Див. сторінку п'ять. Далі цікавіше.")).toEqual([
      "Див. сторінку п'ять.",
      'Далі цікавіше.',
    ]);
  });

  it('keeps «т. д.»-style compounds whole but lets them end sentences', () => {
    expect(splitSentences('Ми купили хліб, молоко і т. д. Потім пішли додому.')).toEqual([
      'Ми купили хліб, молоко і т. д.',
      'Потім пішли додому.',
    ]);
    expect(splitSentences('Сир, т. зв. дуже добрий сир, закінчився.')).toEqual([
      'Сир, т. зв. дуже добрий сир, закінчився.',
    ]);
  });

  it('splits after can-end-a-sentence abbreviations only before a capitalized start', () => {
    expect(splitSentences('Це було 1999 р. у старому будинку.')).toEqual([
      'Це було 1999 р. у старому будинку.',
    ]);
    expect(splitSentences('Це було 1999 р. Ми переїхали.')).toEqual([
      'Це було 1999 р.',
      'Ми переїхали.',
    ]);
  });
});

describe('suggestTitle', () => {
  it('takes opening words up to ~40 chars and trims punctuation', () => {
    expect(suggestTitle('Привіт, як справи? Я сьогодні бачив кота.')).toBe('Привіт, як справи');
    expect(suggestTitle('Слово')).toBe('Слово');
  });
});

describe('slugify / buildImportedPackId', () => {
  it('transliterates Ukrainian titles into StableId-safe slugs (KMU 2010, г→h, ґ→g)', () => {
    expect(slugify('Нічні гості')).toBe('nichni-hosti');
    expect(slugify('Ще борщ!')).toBe('shche-borshch');
    expect(slugify("Сім'я на ґанку")).toBe('simia-na-ganku');
    expect(slugify('Її їжа')).toBe('ii-izha');
    expect(slugify('***')).toBe('tekst');
  });

  it('dedups same-day collisions deterministically (-2, -3)', () => {
    const now = new Date('2026-08-25T12:00:00');
    const first = buildImportedPackId('Лист', [], now);
    expect(first).toBe('imported-20260825-lyst');
    expect(buildImportedPackId('Лист', [first], now)).toBe('imported-20260825-lyst-2');
    expect(buildImportedPackId('Лист', [first, `${first}-2`], now)).toBe(
      'imported-20260825-lyst-3',
    );
  });
});

describe('planImportSplit', () => {
  it('returns under-cap text untouched', () => {
    expect(planImportSplit('Привіт.')).toEqual(['Привіт.']);
  });

  it('splits over-cap input at sentence boundaries, every part within cap', () => {
    const sentence = 'Це дуже темна і довга історія про старий будинок біля лісу.';
    const text = Array(120).fill(sentence).join(' ');
    expect(text.length).toBeGreaterThan(IMPORT_CHAR_CAP);
    const parts = planImportSplit(text);
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) {
      expect(part.length).toBeLessThanOrEqual(IMPORT_CHAR_CAP);
      // parts start/end on sentence boundaries
      expect(part.startsWith('Це')).toBe(true);
      expect(part.endsWith('.')).toBe(true);
    }
    // nothing lost: parts re-join to the sentence-collapsed text
    expect(parts.join(' ')).toBe(splitSentences(text).join(' '));
  });

  it('hard-splits a single pathological over-cap sentence at whitespace', () => {
    const text = Array(1500).fill('слово').join(' '); // one 'sentence', no terminals
    const parts = planImportSplit(text);
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(part.length).toBeLessThanOrEqual(IMPORT_CHAR_CAP);
  });
});
