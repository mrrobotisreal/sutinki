import { describe, expect, it } from 'vitest';

import { createBankRepo } from '../repositories/bank';
import { createTestDb } from './helpers';

/** T05: the Словарь browse surface — encounter counts and filter options. */
describe('bank repository — browse (T05)', () => {
  async function seed(bank = createBankRepo(createTestDb())) {
    await bank.addWord({
      lemma: "п'ять",
      surface: "п'ять",
      translation: 'five',
      pos: 'num',
      level: 'A1',
      sentenceId: 's-1',
      sourceStoryId: 'story-a',
    });
    // Second encounter for the same lemma, typographic apostrophe.
    await bank.addWord({
      lemma: 'п’ять',
      surface: 'п’яти',
      translation: 'five',
      sentenceId: 's-2',
      sourceStoryId: 'story-a',
    });
    await bank.addWord({
      lemma: 'ґанок',
      surface: 'ґанку',
      translation: 'porch',
      pos: 'noun',
      level: 'A2',
      sentenceId: 's-3',
      sourceStoryId: 'story-b',
    });
    await bank.addPhrase({ surface: "здоров'я та щастя", translation: 'health and happiness' });
    return bank;
  }

  it('listItems carries an encounter count per item', async () => {
    const bank = await seed();
    const items = await bank.listItems();
    const five = items.find((i) => i.lemma === "п'ять");
    const porch = items.find((i) => i.lemma === 'ґанок');
    expect(five?.encounterCount).toBe(2);
    expect(porch?.encounterCount).toBe(1);
  });

  it('search finds the same item from every apostrophe spelling, and from ґ or г', async () => {
    const bank = await seed();
    const withAscii = await bank.listItems({ search: "п'ят" });
    const withTypographic = await bank.listItems({ search: 'п’ят' });
    const withModifier = await bank.listItems({ search: 'пʼят' });
    expect(withAscii).toHaveLength(1);
    expect(withTypographic).toHaveLength(1);
    expect(withModifier).toHaveLength(1);
    expect(withAscii[0]!.id).toBe(withTypographic[0]!.id);
    expect(withModifier[0]!.id).toBe(withTypographic[0]!.id);
    const withGe = await bank.listItems({ search: 'ґанк' });
    const withHe = await bank.listItems({ search: 'ганк' });
    expect(withGe).toHaveLength(1);
    expect(withHe[0]!.id).toBe(withGe[0]!.id);
  });

  it('filters compose: kind, level, pos, source story', async () => {
    const bank = await seed();
    expect(await bank.listItems({ kind: 'phrase' })).toHaveLength(1);
    expect((await bank.listItems({ level: 'A2' }))[0]!.lemma).toBe('ґанок');
    expect((await bank.listItems({ pos: 'num' }))[0]!.lemma).toBe("п'ять");
    expect(await bank.listItems({ sourceStoryId: 'story-a' })).toHaveLength(1);
    expect(await bank.listItems({ kind: 'word', level: 'A1', pos: 'noun' })).toHaveLength(0);
  });

  it('getFilterOptions returns only values present, levels in CEFR order', async () => {
    const bank = await seed();
    const opts = await bank.getFilterOptions();
    expect(opts.pos).toEqual(['noun', 'num']);
    expect(opts.levels).toEqual(['A1', 'A2']);
    expect(opts.sourceStoryIds.sort()).toEqual(['story-a', 'story-b']);
  });

  it('manual add (no source) yields an encounter with no sentence/journal ref', async () => {
    const bank = createBankRepo(createTestDb());
    const result = await bank.addWord({ lemma: 'привет', surface: 'привет', translation: 'hi' });
    expect(result.encounter.sentenceId).toBeNull();
    expect(result.encounter.journalEntryId).toBeNull();
    const items = await bank.listItems();
    expect(items[0]!.sourceStoryId).toBeNull();
  });
});
