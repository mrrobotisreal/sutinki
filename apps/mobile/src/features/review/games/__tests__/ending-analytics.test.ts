import { describe, expect, it } from 'vitest';

import { CASE_SLUGS } from '../cloze/stem-split';

/** UT20: analytics props for the ending variant are English slugs only (never Ukrainian text). */
describe('ending analytics slugs', () => {
  it('case slugs are ASCII and cover all seven cases', () => {
    expect(CASE_SLUGS).toHaveLength(7);
    for (const s of CASE_SLUGS) expect(s).toMatch(/^[a-z]+$/);
  });
});
