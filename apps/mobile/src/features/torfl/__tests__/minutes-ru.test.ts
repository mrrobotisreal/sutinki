import { describe, expect, it } from 'vitest';

import { minutesUk } from '../minutes-ru';

describe('minutesUk', () => {
  it('picks the Russian plural form of the rounded minute count', () => {
    expect(minutesUk(60)).toBe('1 минута');
    expect(minutesUk(120)).toBe('2 минуты');
    expect(minutesUk(300)).toBe('5 минут');
    expect(minutesUk(480)).toBe('8 минут');
    expect(minutesUk(600)).toBe('10 минут');
    expect(minutesUk(1260)).toBe('21 минута');
  });
});
