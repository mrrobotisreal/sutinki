import { describe, expect, it } from 'vitest';

import { FOLDED_APOSTROPHE, normalizePhrase, normalizeUk, toFtsQuery } from '../normalize';

/** UT03 / ADR-0004: the Ukrainian tolerant matcher — the single normalizer every matching surface uses. */

describe('normalizeUk', () => {
  it('folds the three apostrophes in the wild (and the two keyboard strays) to U+02BC', () => {
    const ascii = "п'ять"; // U+0027
    const typographic = 'п’ять'; // U+2019
    const modifier = 'пʼять'; // U+02BC
    expect(normalizeUk(ascii)).toBe(normalizeUk(typographic));
    expect(normalizeUk(typographic)).toBe(normalizeUk(modifier));
    expect(normalizeUk(ascii)).toBe('пʼять');
    expect(normalizeUk('п`ять')).toBe('пʼять');
    expect(normalizeUk('п´ять')).toBe('пʼять');
    expect(FOLDED_APOSTROPHE).toBe('ʼ');
  });

  it('folds ґ to г (both cases)', () => {
    expect(normalizeUk('Ґанок')).toBe(normalizeUk('ганок'));
    expect(normalizeUk('ҐАНОК')).toBe('ганок');
    expect(normalizeUk('аґрус')).toBe('агрус');
  });

  it('keeps і, ї, и, е, є distinct', () => {
    const set = new Set(['і', 'ї', 'и', 'е', 'є'].map(normalizeUk));
    expect(set.size).toBe(5);
  });

  it('NFC-normalizes and lowercases', () => {
    expect(normalizeUk('Їжак'.normalize('NFD'))).toBe('їжак');
    expect(normalizeUk('КИЇВ')).toBe('київ');
  });

  it('never touches text that has nothing to fold', () => {
    expect(normalizeUk('дружина')).toBe('дружина');
  });
});

describe('normalizePhrase', () => {
  it('folds apostrophes before collapsing whitespace, so copied and typed phrases dedup', () => {
    expect(normalizePhrase('  Здоров’я  та   щастя ')).toBe('здоровʼя та щастя'.replace("'", 'ʼ'));
    expect(normalizePhrase("здоров'я та щастя")).toBe(normalizePhrase('Здоров’я та щастя'));
  });
});

describe('toFtsQuery', () => {
  it('keeps the folded apostrophe inside the word (U+02BC is a letter to \\p{L})', () => {
    expect(toFtsQuery("п'ять")).toBe('"пʼять"*');
    expect(toFtsQuery('п’ять хвилин')).toBe('"пʼять" "хвилин"*');
  });

  it('folds ґ so a г query and a ґ query are the same MATCH expression', () => {
    expect(toFtsQuery('ґанок')).toBe(toFtsQuery('ганок'));
  });

  it('quotes terms and drops FTS syntax', () => {
    expect(toFtsQuery('стіна" OR "1')).toBe('"стіна" "or" "1"*');
    expect(toFtsQuery('   ')).toBeNull();
    expect(toFtsQuery('"')).toBeNull();
  });
});
