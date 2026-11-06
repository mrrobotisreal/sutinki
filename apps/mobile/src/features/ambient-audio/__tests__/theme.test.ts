import { describe, expect, it } from 'vitest';

import { resolveAmbientTheme } from '../theme';

describe('resolveAmbientTheme', () => {
  it.each([
    ['news', null, 'news'],
    ['news', 'horror', 'news'],
    ['news', 'comedy', 'news'],
    ['education', null, 'education'],
    ['education', 'action', 'education'],
    ['ukr-exam-a1', null, 'education'],
    ['ukr-exam-a2', 'horror', 'education'],
    ['ukr-exam-b1', null, 'education'],
    ['ukr-exam-b2', 'horror', 'education'],
    ['ukr-exam-c1', null, 'education'],
    ['torfl', null, 'horror'],
    ['stories', 'comedy', 'comedy'],
    ['stories', 'action', 'action'],
    ['stories', 'horror', 'horror'],
    ['stories', 'romance', 'horror'],
    ['stories', null, 'horror'],
    ['podcast', null, 'horror'],
    ['podcast', 'comedy', 'horror'],
    ['documentary', null, 'horror'],
    ['travel', null, 'horror'],
    ['', undefined, 'horror'],
    ['something-new', 'comedy', 'horror'],
  ] as const)('%s / %s → %s', (category, genre, expected) => {
    expect(resolveAmbientTheme({ category, genre })).toBe(expected);
  });
});
