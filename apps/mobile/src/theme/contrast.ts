/**
 * WCAG 2.x contrast helpers + the gated token-pair list (UT11, ADR-0009).
 * Pure functions: used by __tests__/contrast.test.ts and scripts/contrast.mjs
 * mirrors the same maths for the markdown table in UI_DESIGN.md.
 */
export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) throw new Error(`bad hex ${hex}`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Composite `fg` at `alpha` over opaque `bg`. */
export function composite(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  return [0, 1, 2].map((i) => fg[i]! * alpha + bg[i]! * (1 - alpha)) as Rgb;
}

/** Parse the `--token: R G B;` triples of one CSS block into hex strings. */
export function parseTokens(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g)) {
    out[m[1]!] = rgbToHex([Number(m[2]), Number(m[3]), Number(m[4])]);
  }
  return out;
}

export interface Pair {
  fg: string;
  bg: string;
  /** Soft wash: fg token composited at alpha over `over` first (chips). */
  min: number;
  label: string;
}

const SURFACES = ['bg', 'surface', 'surface-2'] as const;
const TEXTS = ['text', 'text-muted', 'accent', 'accent-2', 'success', 'danger', 'track-warm'] as const;
const LEVELS = ['level-a1', 'level-a2', 'level-b1', 'level-b2', 'level-c1'] as const;

/** Gated pairs: [fg token, bg token, min ratio]. */
export function gatedPairs(): Pair[] {
  const pairs: Pair[] = [];
  for (const t of TEXTS) for (const s of SURFACES) pairs.push({ fg: t, bg: s, min: 4.5, label: `${t} on ${s}` });
  for (const a of ['accent', 'accent-2']) pairs.push({ fg: 'on-accent', bg: a, min: 4.5, label: `on-accent on ${a}` });
  return pairs;
}

/** Level chips: level text over (level @15% over surface). */
export const CHIP_ALPHA = 0.15;
export { LEVELS, SURFACES, TEXTS };
