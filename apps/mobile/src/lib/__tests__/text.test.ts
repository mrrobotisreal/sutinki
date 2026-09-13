import { describe, expect, it } from 'vitest';

import { answersMatch, foldForAnswer } from '../text';

/** T13: the shared tolerant comparator typed cloze (and future typed modes) use — on `uk` (UT03, ADR-0004). */

describe('foldForAnswer', () => {
  it('lowercases and NFC-normalizes', () => {
    expect(foldForAnswer('СЛОВО')).toBe('слово');
    // decomposed і + combining diaeresis (ї in NFD) folds like composed ї
    expect(foldForAnswer('їжак'.normalize('NFD'))).toBe('їжак');
  });

  it('folds every apostrophe variant to U+02BC', () => {
    expect(foldForAnswer("п'ять")).toBe('пʼять');
    expect(foldForAnswer('п’ять')).toBe('пʼять');
    expect(foldForAnswer('пʼять')).toBe('пʼять');
  });

  it('folds ґ to г', () => {
    expect(foldForAnswer('ґанок')).toBe('ганок');
    expect(foldForAnswer('Ґанок')).toBe('ганок');
  });

  it('strips stress accents without touching й/ї', () => {
    expect(foldForAnswer('сло́во')).toBe('слово');
    expect(foldForAnswer('до̀ма')).toBe('дома');
    expect(foldForAnswer('чай')).toBe('чай');
    expect(foldForAnswer('Київ')).toBe('київ');
  });

  it('collapses and trims whitespace', () => {
    expect(foldForAnswer('  в   домі ')).toBe('в домі');
  });
});

describe('answersMatch', () => {
  it('accepts any apostrophe for any other in both directions (acceptance criterion)', () => {
    expect(answersMatch("п'ять", 'п’ять')).toBe(true);
    expect(answersMatch('п’ять', "п'ять")).toBe(true);
    expect(answersMatch('пʼять', "п'ять")).toBe(true);
  });

  it('accepts г for ґ in both directions', () => {
    expect(answersMatch('ґанок', 'ганок')).toBe(true);
    expect(answersMatch('ганок', 'ґанок')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(answersMatch('Київ', 'київ')).toBe(true);
    expect(answersMatch('слово', 'СЛОВО')).toBe(true);
  });

  it('never folds і/ї/и/е/є into each other', () => {
    expect(answersMatch('їх', 'іх')).toBe(false);
    expect(answersMatch('і', 'и')).toBe(false);
    expect(answersMatch('є', 'е')).toBe(false);
  });

  it('rejects genuinely different words — no edit-distance leniency for typing', () => {
    expect(answersMatch('слово', 'слова')).toBe(false);
    expect(answersMatch('дім', 'том')).toBe(false);
    expect(answersMatch('стіна', '')).toBe(false);
  });
});
