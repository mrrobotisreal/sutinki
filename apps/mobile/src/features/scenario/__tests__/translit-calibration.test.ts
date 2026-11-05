import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { transliterate } from '../../../../../../packages/pipeline/src/translit.ts';
import { scoringTokens } from '@/features/pronunciation/scoring';

import { detectMetaIntent, findGlossaryByTranslit } from '../meta-intents';

/**
 * UT14 translit calibration (ticket Scope 4): 46 English words rendered by a
 * macOS English voice (a PROXY for Mitch's speech) and decoded by the app's
 * NeMo transducer on the host (`fixtures/nemo-uk-translit-proxy.json`).
 * `words` = spoken after a Ukrainian «як сказати» carrier (the real use);
 * `isolated` = the bare word. A word HITS when `findGlossaryByTranslit` (with
 * the app's tail windows / Latin pass-through) matches the entry built from
 * `transliterate(en, 'uk')`. Mitch's live voice is the arbiter.
 */
const fx = JSON.parse(
  readFileSync(new URL('./fixtures/nemo-uk-translit-proxy.json', import.meta.url), 'utf8'),
) as { words: Record<string, string>; isolated: Record<string, string> };

function hits(
  source: Record<string, string>,
  viaCarrier: boolean,
): { hit: number; miss: string[] } {
  let hit = 0;
  const miss: string[] = [];
  for (const [en, heard] of Object.entries(source)) {
    const entry = { id: en, ru: 'x', en, forms: [], translit: transliterate(en, 'uk') };
    const d = viaCarrier ? detectMetaIntent(heard, 'uk') : null;
    const q = d?.intent === 'howtosay' ? d.queryTokens : scoringTokens(heard);
    if (findGlossaryByTranslit(q, [entry], 'uk')) hit++;
    else miss.push(en);
  }
  return { hit, miss };
}

describe('translit calibration against NeMo-uk (proxy speech)', () => {
  it('46 words in both sets', () => {
    expect(Object.keys(fx.words)).toHaveLength(46);
    expect(Object.keys(fx.isolated)).toHaveLength(46);
  });

  it('isolated words: ≥ 85 % have a matching candidate', () => {
    const { hit, miss } = hits(fx.isolated, false);
    expect(hit / 46, `misses: ${miss.join(', ')}`).toBeGreaterThanOrEqual(0.85);
  });

  it('inside the «як сказати» carrier the proxy hit rate does not regress (floor 50 %)', () => {
    const { hit, miss } = hits(fx.words, true);
    expect(hit / 46, `misses: ${miss.join(', ')}`).toBeGreaterThanOrEqual(0.5);
  });
});
