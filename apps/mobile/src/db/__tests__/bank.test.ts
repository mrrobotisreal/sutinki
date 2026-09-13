import { describe, expect, it } from 'vitest';

import { createBankRepo } from '../repositories/bank';
import { createReviewsRepo } from '../repositories/reviews';
import { createTestDb } from './helpers';

describe('bank repository — dedup rules', () => {
  it('lemma dedup: a second surface form adds an encounter, not a new item', async () => {
    const db = createTestDb();
    const bank = createBankRepo(db);

    const first = await bank.addWord({
      lemma: 'слово',
      surface: 'слово',
      translation: 'word',
      sentenceId: 's-1',
    });
    expect(first.created).toBe(true);

    const second = await bank.addWord({
      lemma: 'слово',
      surface: 'словами',
      translation: 'with words',
      sentenceId: 's-2',
    });
    expect(second.created).toBe(false);
    expect(second.item.id).toBe(first.item.id);

    expect(await bank.countItems('word')).toBe(1);
    const item = await bank.getItemWithEncounters(first.item.id);
    expect(item!.encounters).toHaveLength(2);
    expect(item!.encounters.map((e) => e.surface).sort()).toEqual(['словами', 'слово']);
    // Original translation is kept — enrichment/edit is a separate, explicit action.
    expect(item!.translation).toBe('word');
  });

  it('lemma dedup is apostrophe- and ґ/г-tolerant and case-insensitive', async () => {
    const db = createTestDb();
    const bank = createBankRepo(db);

    const withAscii = await bank.addWord({ lemma: "п'ять", surface: "п'ять", translation: 'five' });
    const withTypographic = await bank.addWord({
      lemma: 'П’ять',
      surface: 'п’яти',
      translation: 'five',
    });
    expect(withTypographic.created).toBe(false);
    expect(withTypographic.item.id).toBe(withAscii.item.id);
    // Stored lemma preserves the authored apostrophe (tolerance never mutates text).
    expect(withAscii.item.lemma).toBe("п'ять");
    expect((await bank.findWordByLemma('пʼять'))?.id).toBe(withAscii.item.id);

    // ґ/г: one bank item either way, display keeps the author's letter.
    const withGe = await bank.addWord({ lemma: 'ґанок', surface: 'ґанок', translation: 'porch' });
    const withHe = await bank.addWord({ lemma: 'Ганок', surface: 'ганку', translation: 'porch' });
    expect(withHe.created).toBe(false);
    expect(withHe.item.id).toBe(withGe.item.id);
    expect(withGe.item.lemma).toBe('ґанок');
  });

  it('phrase dedup keys on normalized text (case, apostrophe, whitespace)', async () => {
    const db = createTestDb();
    const bank = createBankRepo(db);

    const a = await bank.addPhrase({
      surface: "Здоров'я та щастя",
      translation: 'health and happiness',
    });
    const b = await bank.addPhrase({
      surface: 'здоров’я  та щастя ',
      translation: 'health and joy',
    });
    expect(b.created).toBe(false);
    expect(b.item.id).toBe(a.item.id);
    expect(await bank.countItems('phrase')).toBe(1);
    const item = await bank.getItemWithEncounters(a.item.id);
    expect(item!.encounters).toHaveLength(2);
  });

  it('words and phrases dedup independently', async () => {
    const db = createTestDb();
    const bank = createBankRepo(db);
    await bank.addWord({ lemma: 'ночь', surface: 'ночью', translation: 'night' });
    await bank.addPhrase({ surface: 'ночью', translation: 'at night' });
    expect(await bank.countItems()).toBe(2);
  });

  it('deleting an item cascades to encounters and cards, and search filters work', async () => {
    const db = createTestDb();
    const bank = createBankRepo(db);
    const reviews = createReviewsRepo(db);

    const added = await bank.addWord({
      lemma: 'стена',
      surface: 'стене',
      translation: 'wall',
      pos: 'noun',
      level: 'A1',
    });
    await reviews.ensureCards(added.item.id);
    expect(await reviews.listCardsForItem(added.item.id)).toHaveLength(4);

    // apostrophe-tolerant substring search over the bank
    expect(await bank.listItems({ search: 'стен' })).toHaveLength(1);
    expect(await bank.listItems({ level: 'A1', pos: 'noun' })).toHaveLength(1);
    expect(await bank.listItems({ kind: 'phrase' })).toHaveLength(0);

    await bank.deleteItem(added.item.id);
    expect(await bank.getItemWithEncounters(added.item.id)).toBeNull();
    expect(await reviews.listCardsForItem(added.item.id)).toHaveLength(0);
  });
});
