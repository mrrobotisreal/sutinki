import type { ChatMessage } from '../client';

/**
 * "Explain this" prompt (ticket feature 3): ad-hoc explanation of a
 * sentence (reader/journal) or a bank card. Response is plain markdown
 * prose — no JSON contract, rendered by MarkdownView. Results are
 * transient (session cache only, not persisted — recorded ticket decision).
 */

export type ExplainTarget =
  | {
      kind: 'sentence';
      uk: string;
      /** Pack translation when we have one (reader sentences). */
      en?: string;
      /** Where it came from, for flavor ("Нічні гості"). */
      sourceTitle?: string;
    }
  | {
      kind: 'card';
      headword: string;
      translation?: string;
      /** Surface form as first met — the saved grammar note describes THIS. */
      surface?: string;
      grammar?: string;
      pos?: string;
      /** An example sentence the learner met the word in. */
      exampleUk?: string;
      /**
       * T38 leech framing: the card keeps failing — the same template plus a
       * "why might this be hard + memory hooks" request (prompt reuse, not a
       * new template; recorded).
       */
      leech?: { againCount: number; windowSize: number; direction: string };
    };

const SYSTEM = `You are a Ukrainian tutor for an English-speaking adult learner (a very early A1 beginner). Explain clearly and concisely in English, in markdown.

For a sentence: give a natural translation (if not provided, or improve on the provided one only if needed), then break down the grammar that a beginner would stumble on — case endings (including the vocative and the locative), verb aspect/tense, word order, idioms. Use a short bullet list per interesting word or construction. Skip trivial words.

For a word or phrase: explain what it means, its grammar (declension/conjugation class, aspect pair for verbs), when to use it vs. near-synonyms, and give 2-3 short example sentences with translations. Mention any false friends or common learner mistakes — including Russian look-alikes with a different meaning, since the learner also knows some Russian.

Write Ukrainian in standard orthography (2019 правопис) and keep every apostrophe and ґ exactly as the word is spelled.

Keep it under ~250 words. No preamble — start with the content.`;

export function buildExplainMessages(target: ExplainTarget): ChatMessage[] {
  let user: string;
  if (target.kind === 'sentence') {
    const parts = [`Explain this Ukrainian sentence:\n\n«${target.uk}»`];
    if (target.en) parts.push(`Provided translation: "${target.en}"`);
    if (target.sourceTitle) parts.push(`(from «${target.sourceTitle}»)`);
    user = parts.join('\n');
  } else {
    const parts = [
      `Explain this Ukrainian ${target.pos ?? 'word or phrase'}: «${target.headword}»`,
    ];
    if (target.translation) parts.push(`My saved translation: "${target.translation}"`);
    if (target.surface && target.surface !== target.headword) {
      parts.push(`I first met it as the form «${target.surface}»`);
      if (target.grammar) parts.push(`Saved grammar note (about that form): ${target.grammar}`);
    } else if (target.grammar) {
      parts.push(`Saved grammar note: ${target.grammar}`);
    }
    if (target.exampleUk) parts.push(`I met it in: «${target.exampleUk}»`);
    if (target.leech) {
      parts.push(
        `This card is a leech for me: I answered "Again" ${target.leech.againCount} times in my last ${target.leech.windowSize} reviews (direction ${target.leech.direction}). Start with why this word might be hard for an English speaker (look-alikes, confusable forms, stress, aspect), then give one or two concrete memory hooks.`,
      );
    }
    user = parts.join('\n');
  }
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: user },
  ];
}
