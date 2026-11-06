import { pluralUk } from '@/lib/uk-plural';
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

const WORDS = ['слово', 'слова', 'слів'] as const;

/** «+12 слів у словнику» / «+0 слів — усі слова вже у словнику». */
export function bankTopicToast(added: number): string {
  return added === 0
    ? '+0 слів — усі слова вже у словнику'
    : `+${added} ${pluralUk(added, WORDS)} у словнику`;
}

/** `torfl_topic_banked.topic` = the story id slug minus the lexicon's `lx-` prefix. */
export function topicSlugOfStory(storyId: string): string {
  return storyId.replace(/^lx-/, '');
}
