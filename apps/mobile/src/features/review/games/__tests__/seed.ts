import { normalizeUk } from '@/db/normalize';
import { packs, sentences, stories, tokens } from '@/db/schema';
import type { SutinkiDB } from '@/db/types';

/**
 * Direct content-table seeding for T13 game tests. Bypasses the importer on
 * purpose: these tests need tiny, precisely-shaped sentences (specific
 * lemmas, levels, word counts), not the fixture packs. Tokens are derived
 * from `uk.split(' ')` — pass `punct: '.'` to append a punctuation token.
 */
export interface SeedSentence {
  id: string;
  uk: string;
  en: string;
  /** One lemma per word of `uk`, aligned by index. */
  lemmas: string[];
  punct?: string;
}

export interface SeedStory {
  packId: string;
  storyId: string;
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  sentences: SeedSentence[];
}

let packSeq = 0;

export async function seedStory(db: SutinkiDB, spec: SeedStory): Promise<void> {
  const level = spec.level ?? 'A1';
  const existingPack = await db.select().from(packs);
  if (!existingPack.some((p) => p.id === spec.packId)) {
    await db.insert(packs).values({
      id: spec.packId,
      version: 1,
      type: 'stories',
      titleUk: `Пак ${++packSeq}`,
      titleEn: `Pack ${packSeq}`,
      level,
      tags: [],
      importedAt: Date.now(),
    });
  }
  await db.insert(stories).values({
    packId: spec.packId,
    id: spec.storyId,
    orderIdx: 0,
    titleUk: spec.storyId,
    titleEn: spec.storyId,
    level,
  });

  for (const [sIdx, s] of spec.sentences.entries()) {
    await db.insert(sentences).values({
      packId: spec.packId,
      id: s.id,
      storyId: spec.storyId,
      orderIdx: sIdx,
      uk: s.uk,
      en: s.en,
      grammarTopics: null,
    });
    const words = s.uk.split(' ');
    if (words.length !== s.lemmas.length) {
      throw new Error(`seedStory: ${s.id} has ${words.length} words but ${s.lemmas.length} lemmas`);
    }
    const rows: (typeof tokens.$inferInsert)[] = words.map((word, i) => ({
      packId: spec.packId,
      sentenceId: s.id,
      tokenIndex: i,
      storyId: spec.storyId,
      text: word,
      textNorm: normalizeUk(word),
      isPunct: false,
      spaceBefore: i > 0,
      lemma: s.lemmas[i]!,
      lemmaNorm: normalizeUk(s.lemmas[i]!),
      translation: `gloss-${i}`,
      pos: 'noun',
      grammar: null,
      level,
      note: null,
    }));
    if (s.punct) {
      rows.push({
        packId: spec.packId,
        sentenceId: s.id,
        tokenIndex: words.length,
        storyId: spec.storyId,
        text: s.punct,
        textNorm: normalizeUk(s.punct),
        isPunct: true,
        spaceBefore: false,
        lemma: null,
        lemmaNorm: null,
        translation: null,
        pos: null,
        grammar: null,
        level: null,
        note: null,
      });
    }
    await db.insert(tokens).values(rows);
  }
}
