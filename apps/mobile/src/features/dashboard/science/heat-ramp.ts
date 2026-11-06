import type { ColorTokens, ThemeScheme } from '@/theme/colors';

import { mixHex } from '../mix-hex';
import type { HeatLevel } from './heatmap';

/**
 * The sequential year-heatmap ramp, derived from the accent per theme (one hue,
 * monotone lightness). Pure so the T22 contrast bar can be unit-tested for the
 * Sutinki accent (`heat-ramp.test.ts`): every active step >= 3:1 vs the card
 * surface in both schemes (WCAG 1.4.11 non-text). Level 0 (no activity) is the
 * near-neutral track so "nothing" never reads as "a little".
 */
export function buildHeatRamp(
  tokens: Pick<ColorTokens, 'accent' | 'text' | 'surface'>,
  scheme: ThemeScheme,
): Record<HeatLevel, string> {
  const empty = mixHex(tokens.text, tokens.surface, 0.08);
  if (scheme === 'dark') {
    return {
      0: empty,
      1: tokens.accent,
      2: mixHex(tokens.text, tokens.accent, 0.2),
      3: mixHex(tokens.text, tokens.accent, 0.4),
      4: mixHex(tokens.text, tokens.accent, 0.62),
    };
  }
  return {
    0: empty,
    1: mixHex(tokens.accent, tokens.surface, 0.75),
    2: tokens.accent,
    3: mixHex(tokens.text, tokens.accent, 0.3),
    4: mixHex(tokens.text, tokens.accent, 0.6),
  };
}
