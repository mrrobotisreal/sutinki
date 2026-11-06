import { describe, expect, it } from 'vitest';

import { colors } from '@/theme/colors';
import { contrastRatio, hexToRgb, luminance } from '@/theme/contrast';

import { buildHeatRamp } from '../heat-ramp';

/** T22 contrast bar for the year heatmap, measured for the Sutinki accent (UP05). */
describe.each(['dark', 'light'] as const)('heatmap ramp — %s', (scheme) => {
  const tokens = colors[scheme];
  const ramp = buildHeatRamp(tokens, scheme);
  const surface = hexToRgb(tokens.surface);

  it('every active step (1-4) has >= 3:1 against the card surface', () => {
    const numbers = ([1, 2, 3, 4] as const).map((l) => {
      const r = contrastRatio(hexToRgb(ramp[l]), surface);
      expect(r, `${scheme} level ${l} ${ramp[l]}`).toBeGreaterThanOrEqual(3);
      return `${ramp[l]} ${r.toFixed(1)}`;
    });
    console.info(`HEAT_NUMBERS ${scheme} (on ${tokens.surface}): ${numbers.join(' · ')}`);
  });

  it('is monotone in lightness (dark: lighter = more; light: darker = more)', () => {
    const lum = ([1, 2, 3, 4] as const).map((l) => luminance(hexToRgb(ramp[l])));
    for (let i = 1; i < lum.length; i++) {
      if (scheme === 'dark') expect(lum[i]!).toBeGreaterThan(lum[i - 1]!);
      else expect(lum[i]!).toBeLessThan(lum[i - 1]!);
    }
  });

  it('level 0 is the near-neutral track, quieter than level 1', () => {
    expect(contrastRatio(hexToRgb(ramp[0]), surface)).toBeLessThan(
      contrastRatio(hexToRgb(ramp[1]), surface),
    );
  });
});
