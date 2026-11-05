#!/usr/bin/env node
// Rename the data-language keys in fixtures Sumrak ships with `ru`:
//   JSON: keys ru -> uk, *Ru -> *Uk; values 'ru-en'/'en-ru' -> 'uk-en'/'en-uk'; {language:'ru'} -> 'uk' ONLY with --language
//   (scenario fixtures that stay Russian engine fixtures keep language:'ru').
//   Markdown drafts: leading `RU:` -> `UK:`; frontmatter `ru:` keys -> `uk:`.
// The Cyrillic CONTENT is untouched (Russian engine fixtures stay Russian, listed in ru-allowlist.txt).
// usage: node scripts/upstream/fixture-ru-to-uk.mjs [--language] <file...>   then `pnpm format` and `pnpm pipeline validate <pack.json>`.
import fs from 'node:fs';

const isRuKey = (k) => k === 'ru' || /[a-z]Ru$/.test(k);
const rename = (k) => (k === 'ru' ? 'uk' : k.replace(/Ru$/, 'Uk'));
const flipLanguage = process.argv.includes('--language');
function walk(v, key) {
  if (Array.isArray(v)) return v.map((x) => walk(x));
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [isRuKey(k) ? rename(k) : k, walk(x, k)]),
    );
  if (v === 'ru-en') return 'uk-en';
  if (v === 'en-ru') return 'en-uk';
  if (flipLanguage && key === 'language' && v === 'ru') return 'uk';
  return v;
}
for (const f of process.argv.slice(2).filter((a) => !a.startsWith('--'))) {
  const s = fs.readFileSync(f, 'utf8');
  const out = f.endsWith('.json')
    ? JSON.stringify(walk(JSON.parse(s)), null, 2) + '\n'
    : s.replace(/^RU:/gm, 'UK:').replace(/(^|[\s{,])ru:/g, '$1uk:');
  fs.writeFileSync(f, out);
  console.log('converted', f);
}
