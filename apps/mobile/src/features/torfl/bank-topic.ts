import { bulkBankToast, NEW_PER_DAY_DEFAULT } from '@/features/review/due-core';
import { isTorflCategory } from './level-profile';

/**
 * «Додати всі слова до словника» (T69, UT16b) — the pure parts: which
 * stories offer the action, the toast copy, and the analytics topic slug.
 * Generic code gated to the `ukr-exam:lexicon` tag so it never appears on a
 * creepypasta. The write itself is `repos.bank.bankLemmasFromStory`.
 */

export const LEXICON_TAG = 'ukr-exam:lexicon';

/**
 * The reader shows the action only on an «Іспит» shelf pack (`ukr-exam-<level>`) tagged
 * `ukr-exam:lexicon`.
 */
export function canBankTopic(pack: { category: string | null; tags: readonly string[] }): boolean {
  return isTorflCategory(pack.category) && pack.tags.includes(LEXICON_TAG);
}

/**
 * «+87 слів у Словнику · по 10 на день» / «+0 слів — усі слова вже в Словнику».
 * T82: new words join the queue at the daily budget, the toast says so.
 */
export function bankTopicToast(added: number, perDay: number = NEW_PER_DAY_DEFAULT): string {
  return bulkBankToast(added, perDay);
}

/** `torfl_topic_banked.topic` = the story id slug minus the lexicon's `lx-` prefix. */
export function topicSlugOfStory(storyId: string): string {
  return storyId.replace(/^lx-/, '');
}
