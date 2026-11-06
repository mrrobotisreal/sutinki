import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { colors } from '../colors';
import {
  CHIP_ALPHA,
  LEVELS,
  SURFACES,
  composite,
  contrastRatio,
  gatedPairs,
  hexToRgb,
  parseTokens,
} from '../contrast';

const css = readFileSync(join(__dirname, '../../global.css'), 'utf8');
const lightBlock = css.slice(css.indexOf(':root {'), css.indexOf('.dark:root'));
const darkBlock = css.slice(css.indexOf('.dark:root'));
const modes = { light: parseTokens(lightBlock), dark: parseTokens(darkBlock) } as const;

describe.each(['dark', 'light'] as const)('WCAG contrast — %s', (mode) => {
  const t = modes[mode];
  const rgb = (k: string) => hexToRgb(t[k]!);

  it.each(gatedPairs().map((p) => [p.label, p] as const))('%s', (_l, p) => {
    expect(contrastRatio(rgb(p.fg), rgb(p.bg))).toBeGreaterThanOrEqual(p.min);
  });

  for (const lvl of LEVELS) {
    for (const s of SURFACES) {
      it(`${lvl} chip text on ${s} wash >= 4.5`, () => {
        const wash = composite(rgb(lvl), CHIP_ALPHA, rgb(s));
        expect(contrastRatio(rgb(lvl), wash)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('border is visible against surface (>= 1.3)', () => {
    expect(contrastRatio(rgb('border'), rgb('surface'))).toBeGreaterThanOrEqual(1.3);
  });

  // UP08 (Decision 4): the karaoke word wash is gold at --karaoke-alpha over the surface; text stays `text`.
  // Recorded: dark #E8E6E3 on blend(bg, #E9C032, .42) = 5.54:1 (surface 5.09:1); light #1A1A1F on
  // blend(bg, #B8920A, .35) = 11.50:1 (surface 12.27:1).
  it.each(SURFACES)('karaoke wash keeps the reading text >= 4.5 on %s', (s) => {
    const alpha = Number(
      new RegExp(`--karaoke-alpha:\\s*([0-9.]+)`).exec(
        mode === 'dark' ? darkBlock : lightBlock,
      )![1],
    );
    const wash = composite(rgb('karaoke'), alpha, rgb(s));
    expect(contrastRatio(rgb('text'), wash)).toBeGreaterThanOrEqual(4.5);
  });

  it('hotel tokens carry Sutinki values and colors.ts mirrors them', () => {
    const c = colors[mode];
    expect(t['hotel-glow']).toBe('#F2D35B');
    expect(t['hotel-glow-dim']).toBe('#9C7E25');
    expect(t['hotel-brass']).toBe('#B9A16A');
    expect(t['hotel-plate']).toBe('#0E1320');
    expect(c.hotelGlow.toUpperCase()).toBe(t['hotel-glow']);
    expect(c.hotelGlowDim.toUpperCase()).toBe(t['hotel-glow-dim']);
    expect(c.hotelBrass.toUpperCase()).toBe(t['hotel-brass']);
    expect(c.hotelPlate.toUpperCase()).toBe(t['hotel-plate']);
  });

  it('colors.ts mirrors global.css', () => {
    const c = colors[mode];
    expect(c.bg.toUpperCase()).toBe(t['bg']);
    expect(c.surface.toUpperCase()).toBe(t['surface']);
    expect(c.surface2.toUpperCase()).toBe(t['surface-2']);
    expect(c.text.toUpperCase()).toBe(t['text']);
    expect(c.textMuted.toUpperCase()).toBe(t['text-muted']);
    expect(c.accent.toUpperCase()).toBe(t['accent']);
    expect(c.accent2.toUpperCase()).toBe(t['accent-2']);
    expect(c.onAccent.toUpperCase()).toBe(t['on-accent']);
    expect(c.success.toUpperCase()).toBe(t['success']);
    expect(c.danger.toUpperCase()).toBe(t['danger']);
    expect(c.border.toUpperCase()).toBe(t['border']);
    expect(c.trackWarm.toUpperCase()).toBe(t['track-warm']);
  });
});
