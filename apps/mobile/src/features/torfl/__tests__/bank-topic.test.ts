import { describe, expect, it } from 'vitest';

import { LEXICON_TAG, canBankTopic } from '../bank-topic';

describe('canBankTopic (T69, UT16b)', () => {
  it('the lexicon tag is ukr-exam:lexicon', () => {
    expect(LEXICON_TAG).toBe('ukr-exam:lexicon');
  });

  it('every Іспит shelf (ukr-exam-a1…c1) tagged ukr-exam:lexicon banks', () => {
    for (const category of ['ukr-exam-a1', 'ukr-exam-a2', 'ukr-exam-b1', 'ukr-exam-b2', 'ukr-exam-c1']) {
      expect(canBankTopic({ category, tags: [LEXICON_TAG] })).toBe(true);
    }
  });

  it('the old TORFL shelves and tag no longer bank', () => {
    expect(canBankTopic({ category: 'torfl', tags: ['torfl:lexicon'] })).toBe(false);
    expect(canBankTopic({ category: 'torfl-a2', tags: [LEXICON_TAG] })).toBe(false);
    expect(canBankTopic({ category: 'ukr-exam-a1', tags: ['torfl:lexicon'] })).toBe(false);
  });

  it('an Іспит shelf pack without the lexicon tag does not bank', () => {
    expect(canBankTopic({ category: 'ukr-exam-b1', tags: [] })).toBe(false);
    expect(canBankTopic({ category: 'ukr-exam-a2', tags: ['ukr-exam:exam'] })).toBe(false);
  });

  it('a creepypasta tagged ukr-exam:lexicon (not an Іспит shelf) does not bank', () => {
    expect(canBankTopic({ category: 'stories', tags: [LEXICON_TAG] })).toBe(false);
  });

  it('a pack with no category does not bank', () => {
    expect(canBankTopic({ category: null, tags: [LEXICON_TAG] })).toBe(false);
  });
});

describe('bank toast (UT16b)', () => {
  it('Ukrainian plural, no leading Russian forms', async () => {
    const { bankTopicToast, topicSlugOfStory } = await import('../bank-topic');
    expect(bankTopicToast(1)).toBe('+1 слово у словнику');
    expect(bankTopicToast(23)).toBe('+23 слова у словнику');
    expect(bankTopicToast(67)).toBe('+67 слів у словнику');
    expect(bankTopicToast(0)).toBe('+0 слів — усі слова вже у словнику');
    expect(topicSlugOfStory('lx-o-sebe')).toBe('o-sebe');
  });
});
