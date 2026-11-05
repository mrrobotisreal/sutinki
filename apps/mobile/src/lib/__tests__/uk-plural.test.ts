import { describe, expect, it } from 'vitest';

import { pluralUk } from '@/lib/uk-plural';

const forms = ['речення', 'речення', 'речень'] as const;
const words = ['книга', 'книги', 'книг'] as const;

describe('pluralUk', () => {
  it.each([
    [1, 'книга'],
    [2, 'книги'],
    [5, 'книг'],
    [11, 'книг'],
    [12, 'книг'],
    [21, 'книга'],
    [22, 'книги'],
    [25, 'книг'],
    [100, 'книг'],
    [101, 'книга'],
    [0, 'книг'],
  ])('%i -> %s', (n, expected) => {
    expect(pluralUk(n, words)).toBe(expected);
  });

  it('works with the sentence forms', () => {
    expect(pluralUk(1, forms)).toBe('речення');
    expect(pluralUk(3, forms)).toBe('речення');
    expect(pluralUk(7, forms)).toBe('речень');
  });
});
