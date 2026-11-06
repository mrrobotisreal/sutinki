import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LemmaListSchema,
  normalizeLemmaUk,
  parsePack,
  referenceLemmaKey,
  safeParsePack,
} from '../src';

const fixture = () =>
  JSON.parse(
    readFileSync(
      join(__dirname, '..', 'fixtures', 'packs', 'core-lemmas-fixture', 'pack.json'),
      'utf8',
    ),
  ) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function issues(pack: unknown): string[] {
  const r = safeParsePack(pack);
  return r.success ? [] : r.issues.map((i) => `${i.path}: ${i.message}`);
}

describe('reference pack (T38, Ukrainian charset)', () => {
  it('the fixture validates: stories-free, two lists, apostrophe + ґ lemmas', () => {
    const pack = parsePack(fixture());
    expect(pack.type).toBe('reference');
    expect(pack.stories).toHaveLength(0);
    expect(pack.lemmaLists?.map((l) => l.id)).toEqual(['uk-a1-core', 'uk-a2-core']);
    const lemmas = pack.lemmaLists?.flatMap((l) => l.lemmas.map((e) => e.lemma)) ?? [];
    expect(lemmas).toContain("п'ять");
    expect(lemmas).toContain('ґанок');
    expect(lemmas).toContain('пʼятниця');
  });

  it('a reference pack needs at least one list', () => {
    const p = fixture();
    delete p.lemmaLists;
    expect(issues(p).join('\n')).toContain('must contain at least one lemma list');
  });

  it('list ids are unique within the pack', () => {
    const p = fixture();
    p.lemmaLists[1].id = 'uk-a1-core';
    expect(issues(p).join('\n')).toContain('duplicate lemma list id "uk-a1-core"');
  });

  it('rejects a duplicate folded lemma + pos inside one list (ґ/г and apostrophe fold)', () => {
    const p = fixture();
    p.lemmaLists[0].lemmas.push({ lemma: 'ганок', pos: 'noun' });
    expect(issues(p).join('\n')).toContain('duplicate lemma "ганок" (noun)');
    const q = fixture();
    q.lemmaLists[0].lemmas.push({ lemma: 'п’ять', pos: 'num' });
    expect(issues(q).join('\n')).toContain('duplicate lemma "п’ять" (num)');
  });

  it('the same lemma under another POS is allowed', () => {
    const r = LemmaListSchema.safeParse({
      id: 'x',
      level: 'A1',
      title: { uk: 'x', en: 'x' },
      lemmas: [
        { lemma: 'мати', pos: 'verb' },
        { lemma: 'мати', pos: 'noun' },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('rejects Russian-only letters, capitals, spaces and Latin', () => {
    for (const bad of [
      'дом ы',
      'ёж',
      'экран',
      'объект',
      'ы',
      'Дім',
      'dom',
      'два слова',
      "'дім",
      "дім'",
      'дім-',
    ]) {
      const p = fixture();
      p.lemmaLists[0].lemmas[0].lemma = bad;
      expect(issues(p).length, bad).toBeGreaterThan(0);
    }
  });

  it('accepts apostrophe variants, hyphen, ґ є і ї', () => {
    for (const ok of ["п'ять", 'пʼять', 'п’ять', 'десь-небудь', 'ґанок', 'їжа', 'євро', 'ніч']) {
      const p = fixture();
      p.lemmaLists[0].lemmas = [{ lemma: ok }];
      expect(issues(p), ok).toEqual([]);
    }
  });

  it('referenceLemmaKey folds case, apostrophes and ґ like the app normalizeUk', () => {
    expect(referenceLemmaKey('Ґанок')).toBe('ганок');
    expect(referenceLemmaKey("П'ять")).toBe('пʼять');
  });

  it('parity with apps/mobile normalizeUk on a shared table of 12 inputs', async () => {
    const inputs = [
      "п'ять",
      'п’ять',
      'пʼять',
      'п`ять',
      'п´ять',
      'ґанок',
      'Ґудзик',
      'ЇЖА',
      'Євро',
      'мʼясо',
      'сім’я',
      'ніч',
    ];
    // normalize.ts is dependency-free, so the schema test can import the app's own copy.
    const { normalizeUk } = await import('../../../apps/mobile/src/db/normalize');
    for (const s of inputs) expect(normalizeLemmaUk(s), s).toBe(normalizeUk(s));
  });

  it('lemmaLists on a non-reference pack are allowed (additive section)', () => {
    const p = fixture();
    p.type = 'prompts';
    p.prompts = [{ id: 'p1', level: 'A1', prompt: { uk: 'Привіт', en: 'Hi' } }];
    expect(issues(p)).toEqual([]);
  });
});
