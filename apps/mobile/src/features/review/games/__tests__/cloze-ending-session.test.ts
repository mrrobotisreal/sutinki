import { describe, expect, it } from 'vitest';

import { createTestDb } from '@/db/__tests__/helpers';
import { createRepositories } from '@/db/repositories';
import nounFixture from '@/features/ai/__tests__/__fixtures__/word-profile-noun.json';
import nounFemFixture from '@/features/ai/__tests__/__fixtures__/word-profile-noun-fem.json';
import { WordProfileSchema } from '@/features/word-forms/profile-schema';
import { clozeOutcomeToRating } from '@/features/review/mapping';
import { Rating } from '@/db/repositories/reviews';

import { buildClozeSession } from '../cloze/session';
import { seedStory } from './seed';

/** UT20: the case-ending variant in the session builder (real DB, captured profiles). */

function payload(f: unknown) {
  const content = (f as { choices: { message: { content: string } }[] }).choices[0]!.message
    .content;
  return WordProfileSchema.parse(JSON.parse(content)) as unknown as Record<string, unknown>;
}

const RECEIPT = {
  provider: 'anthropic' as const,
  model: 'm',
  quality: 'normal' as const,
  effort: 'high' as const,
  effortApplied: true,
  durationMs: 1,
};

async function setup() {
  const db = createTestDb();
  const repos = createRepositories(db);
  await seedStory(db, {
    packId: 'p1',
    storyId: 'st1',
    sentences: [
      {
        id: 's1',
        uk: 'Він сидів за столом',
        en: 'He sat at the table',
        lemmas: ['він', 'сидіти', 'за', 'стіл'],
      },
      { id: 's2', uk: 'Мамо йди сюди', en: 'Mum come here', lemmas: ['мама', 'йти', 'сюди'] },
      { id: 's3', uk: 'Це слово тут', en: 'This word here', lemmas: ['це', 'слово', 'тут'] },
    ],
  });
  // vocative note on the token «Мамо»
  const { tokens } = await import('@/db/schema');
  const { eq, and } = await import('drizzle-orm');
  await db
    .update(tokens)
    .set({ grammar: 'f.sg. voc. (address)' })
    .where(and(eq(tokens.sentenceId, 's2'), eq(tokens.tokenIndex, 0)));
  for (const [lemma, pos] of [
    ['стіл', 'noun'],
    ['мама', 'noun'],
    ['слово', 'noun'],
  ] as const) {
    await repos.bank.addWord({ lemma, surface: lemma, translation: lemma, pos, level: 'A1' });
  }
  await repos.reading.markFinished('p1', 'st1');
  await repos.wordForms.insertProfile({
    lemmaNorm: 'стіл',
    kind: 'word',
    headword: 'стіл',
    pos: 'noun',
    payload: payload(nounFixture),
    ...RECEIPT,
  });
  await repos.wordForms.insertProfile({
    lemmaNorm: 'мама',
    kind: 'word',
    headword: 'мама',
    pos: 'noun',
    payload: payload(nounFemFixture),
    ...RECEIPT,
  });
  return { repos };
}

describe('buildClozeSession — ending variant (UT20)', () => {
  it('serves the ending variant for profiled, eligible sentences; falls back silently otherwise', async () => {
    const { repos } = await setup();
    const session = await buildClozeSession(repos, { limit: 10 });
    const byLemma = new Map(session.map((e) => [e.item.lemma, e]));
    expect(byLemma.size).toBe(3);

    const stil = byLemma.get('стіл')!;
    expect(stil.variant).toBe('ending');
    expect(stil.ending).toMatchObject({ stem: 'ст', endings: ['олом'], caseSlug: 'instr' });

    const mama = byLemma.get('мама')!;
    expect(mama.variant).toBe('ending');
    expect(mama.ending).toMatchObject({ stem: 'Мам', endings: ['о'], caseSlug: 'voc' });

    // no profile -> ordinary cloze (tiles or typed), no ending payload
    const slovo = byLemma.get('слово')!;
    expect(slovo.variant === 'tiles' || slovo.variant === 'typed').toBe(true);
    expect(slovo.ending).toBeUndefined();
  });

  it('probability 0 disables the variant entirely', async () => {
    const { repos } = await setup();
    const session = await buildClozeSession(repos, { limit: 10, endingProbability: 0 });
    expect(session.every((e) => e.variant !== 'ending')).toBe(true);
  });

  it('ending outcomes use the typed rating rules (hint caps Hard, wrong/reveal Again)', () => {
    const base = { variant: 'ending' as const, hintsUsed: 0, revealed: false, durationMs: 1 };
    expect(clozeOutcomeToRating({ ...base, correct: true })).toBe(Rating.Good);
    expect(clozeOutcomeToRating({ ...base, correct: true, hintsUsed: 1 })).toBe(Rating.Hard);
    expect(clozeOutcomeToRating({ ...base, correct: false })).toBe(Rating.Again);
    expect(clozeOutcomeToRating({ ...base, correct: true, revealed: true })).toBe(Rating.Again);
  });
});
