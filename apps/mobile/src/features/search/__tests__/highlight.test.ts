import { describe, expect, it } from 'vitest';

import { highlightSnippet } from '../highlight';

describe('highlightSnippet', () => {
  it('marks exactly the matched surfaces, punctuation-tolerant', () => {
    const segs = highlightSnippet('В стене — стук, снова стук.', ['стук']);
    const marked = segs.filter((s) => s.matched).map((s) => s.text);
    expect(marked).toEqual(['стук,', 'стук.']);
  });

  it('is apostrophe- and ґ/г-tolerant in both directions', () => {
    expect(highlightSnippet("П'ять котів.", ['п’ять']).find((s) => s.matched)?.text).toBe("П'ять");
    expect(highlightSnippet('Пʼять стін.', ["п'ять"]).find((s) => s.matched)?.text).toBe('Пʼять');
    expect(highlightSnippet('Ґанок старий.', ['ганок']).find((s) => s.matched)?.text).toBe('Ґанок');
  });

  it('rebuilds the sentence exactly from its segments', () => {
    const uk = 'Он  стоит   у стены.';
    const segs = highlightSnippet(uk, []);
    expect(segs.map((s) => s.text).join('')).toBe(uk);
  });

  it('never matches on empty cores (pure punctuation chunks)', () => {
    const segs = highlightSnippet('Стук — стук', ['—']);
    expect(segs.some((s) => s.matched)).toBe(false);
  });
});
