#!/usr/bin/env node
// Prints the measured WCAG contrast table (markdown) from src/global.css.
// Same maths as src/theme/contrast.ts. Usage: node scripts/contrast.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/global.css'), 'utf8');
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const parse = (blk) => Object.fromEntries([...blk.matchAll(/--([a-z0-9-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g)].map((m) => [m[1], [+m[2], +m[3], +m[4]]]));
const lum = ([r, g, b]) => { const l = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (f, a, b) => f.map((v, i) => v * a + b[i] * (1 - a));
const light = parse(css.slice(css.indexOf(':root {'), css.indexOf('.dark:root')));
const dark = parse(css.slice(css.indexOf('.dark:root')));
const S = ['bg', 'surface', 'surface-2'];
for (const [name, t, kar] of [['Dark', dark, 0.42], ['Light', light, 0.35]]) {
  console.log(`\n### ${name}\n\n| Token | hex | on bg | on surface | on surface-2 |\n|---|---|---|---|---|`);
  for (const k of ['text', 'text-muted', 'accent', 'accent-2', 'success', 'danger', 'track-warm']) console.log(`| ${k} | ${hex(...t[k])} | ${S.map((s) => ratio(t[k], t[s]).toFixed(2)).join(' | ')} |`);
  for (const k of ['level-a1', 'level-a2', 'level-b1', 'level-b2', 'level-c1']) console.log(`| ${k} chip text (on ${'15% wash'}) | ${hex(...t[k])} | ${S.map((s) => ratio(t[k], mix(t[k], 0.15, t[s])).toFixed(2)).join(' | ')} |`);
  console.log(`| on-accent / accent | ${hex(...t['on-accent'])} | ${ratio(t['on-accent'], t.accent).toFixed(2)} | | |`);
  console.log(`| on-accent / accent-2 | ${hex(...t['on-accent'])} | ${ratio(t['on-accent'], t['accent-2']).toFixed(2)} | | |`);
  console.log(`| border vs surface (decorative) | ${hex(...t.border)} | ${ratio(t.border, t.surface).toFixed(2)} | | |`);
  const kf = mix(name === 'Dark' ? t.accent : [184, 146, 10], kar, t.bg);
  console.log(`| karaoke fill (${kar * 100}%) forward note: text on fill | | ${ratio(t.text, kf).toFixed(2)} | | |`);
}
