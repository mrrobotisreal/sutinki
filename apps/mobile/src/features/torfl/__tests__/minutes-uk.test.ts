import { describe, expect, it } from 'vitest';

import { minutesUk } from '../minutes-uk';

describe('minutesUk', () => {
  it('picks the Ukrainian plural form of the rounded minute count (1/2/5/11/21/22)', () => {
    expect(minutesUk(60)).toBe('1 хвилина');
    expect(minutesUk(120)).toBe('2 хвилини');
    expect(minutesUk(300)).toBe('5 хвилин');
    expect(minutesUk(660)).toBe('11 хвилин');
    expect(minutesUk(1260)).toBe('21 хвилина');
    expect(minutesUk(1320)).toBe('22 хвилини');
  });
});
