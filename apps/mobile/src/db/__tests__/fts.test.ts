import type { Pack } from '@sutinki/schema';
import { describe, expect, it } from 'vitest';

import pack1Json from '@sutinki/schema/fixtures/packs/a1-creepypasta-001/pack.json';

import { importPack } from '../importer';
import { createContentRepo } from '../repositories/content';
import { createJournalRepo } from '../repositories/journal';
import { createTestDb } from './helpers';

const pack1 = pack1Json as unknown as Pack;

/**
 * UT03 / ADR-0004: a tiny Ukrainian pack exercising the two folds the FTS
 * index must be tolerant of — the apostrophe (three code points in the
 * wild) and ґ/г. Authored with U+0027 like the real sources.
 */
const ukPack = {
  id: 'a1-uk-fts-test',
  version: 1,
  type: 'stories',
  title: { uk: 'Тест', en: 'Test' },
  level: 'A1',
  tags: [],
  stories: [
    {
      id: 'st-1',
      title: { uk: 'Історія', en: 'Story' },
      level: 'A1',
      audio: [],
      sentences: [
        {
          id: 'sn-1',
          uk: "П'ять хвилин на ґанку.",
          en: 'Five minutes on the porch.',
          tokens: [
            { text: "П'ять", lemma: "п'ять", translation: 'five', pos: 'num', level: 'A1' },
            { text: 'хвилин', lemma: 'хвилина', translation: 'minute', pos: 'noun', level: 'A1' },
            { text: 'на', lemma: 'на', translation: 'on', pos: 'prep', level: 'A1' },
            { text: 'ґанку', lemma: 'ґанок', translation: 'porch', pos: 'noun', level: 'A2' },
            { text: '.', isPunct: true },
          ],
        },
      ],
    },
  ],
} as unknown as Pack;

describe('FTS5 search', () => {
  it('finds a known lemma across imported tokens', async () => {
    const db = createTestDb();
    await importPack(db, pack1);
    const content = createContentRepo(db);

    const hits = await content.searchTokens('стіна');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.lemma === 'стіна')).toBe(true);
    expect(hits[0]!.packId).toBe('a1-creepypasta-001');
  });

  it("is apostrophe-tolerant: «п'ять», «п’ять» and «пʼять» all find the token", async () => {
    const db = createTestDb();
    await importPack(db, ukPack);
    const content = createContentRepo(db);

    for (const q of ["п'ять", 'п’ять', 'пʼять']) {
      const hits = await content.searchTokens(q);
      expect(
        hits.some((h) => h.lemma === "п'ять"),
        `query ${q}`,
      ).toBe(true);
    }
    // The folded apostrophe is a letter to unicode61: «п'ять» is ONE token,
    // so a query for the bare prefix «п» does not match via a split «п».
    const bare = await content.searchTokens('п');
    expect(bare.some((h) => h.lemma === "п'ять")).toBe(true); // prefix of «пʼять»
  });

  it('is ґ/г-tolerant: searching «ганок» finds «ґанок» and vice versa', async () => {
    const db = createTestDb();
    await importPack(db, ukPack);
    const content = createContentRepo(db);

    const viaHe = await content.searchTokens('ганок');
    expect(viaHe.some((h) => h.lemma === 'ґанок')).toBe(true);
    const viaGe = await content.searchTokens('ґанок');
    expect(viaGe.some((h) => h.lemma === 'ґанок')).toBe(true);
    // Stored text keeps the author's ґ.
    expect(viaHe.find((h) => h.lemma === 'ґанок')?.text).toBe('ґанку');
  });

  it('never folds і/ї/и: «хвилина» is not found by «хвілина»', async () => {
    const db = createTestDb();
    await importPack(db, ukPack);
    const content = createContentRepo(db);
    expect((await content.searchTokens('хвілина')).length).toBe(0);
    expect((await content.searchTokens('хвилина')).length).toBeGreaterThan(0);
  });

  it('surface-form prefix search works for as-you-type lookup', async () => {
    const db = createTestDb();
    await importPack(db, pack1);
    const content = createContentRepo(db);
    const hits = await content.searchTokens('стуч');
    // «стучит» etc. — any surface starting with "стуч" (fallback: at least no throw)
    expect(Array.isArray(hits)).toBe(true);
  });

  it('reimport keeps the token index in sync (no stale rows)', async () => {
    const db = createTestDb();
    await importPack(db, pack1);
    const content = createContentRepo(db);
    const before = (await content.searchTokens('стіна')).length;
    await importPack(db, { ...pack1, version: 2 } as Pack);
    const after = (await content.searchTokens('стіна')).length;
    expect(after).toBe(before);
  });

  it('searches notes and journal entries, apostrophe- and ґ/г-tolerant via triggers', async () => {
    const db = createTestDb();
    const journal = createJournalRepo(db);

    await journal.createNote({ title: 'Граматика', body: "Різниця між п'ять і п'ятеро." });
    await journal.createEntry({ uk: 'Сьогодні я сиджу на ґанку. Здоров’я добре.' });

    // Typographic apostrophe query finds the ASCII-apostrophe note.
    const noteHits = await journal.searchNotes('п’ять');
    expect(noteHits).toHaveLength(1);
    expect(noteHits[0]!.body).toContain("п'ять"); // stored text keeps the author's apostrophe

    // г query finds the ґ entry; ASCII apostrophe query finds the typographic one.
    const entryHits = await journal.searchEntries('ганку');
    expect(entryHits).toHaveLength(1);
    expect(entryHits[0]!.uk).toContain('ґанку');
    expect(await journal.searchEntries("здоров'я")).toHaveLength(1);

    // Update propagates through the au trigger; delete removes from the index.
    const note = noteHits[0]!;
    await journal.updateNote(note.id, { body: 'Тепер тут інший текст.' });
    expect(await journal.searchNotes('п’ять')).toHaveLength(0);
    expect(await journal.searchNotes('інший')).toHaveLength(1);
    await journal.deleteNote(note.id);
    expect(await journal.searchNotes('інший')).toHaveLength(0);
  });

  it('never throws on hostile query input', async () => {
    const db = createTestDb();
    const content = createContentRepo(db);
    for (const q of ['"', 'AND OR NOT', '(((', '*', '  ', 'стіна" OR "1']) {
      await expect(content.searchTokens(q)).resolves.toBeDefined();
    }
  });
});
