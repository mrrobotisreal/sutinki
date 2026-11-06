import { describe, expect, it } from 'vitest';

import { createTestDb } from '@/db/__tests__/helpers';
import { createRepositories } from '@/db/repositories';
import { SETTING_KEYS } from '@/db/repositories/settings';
import { encounters } from '@/db/schema';

import { resolveListeningAudio } from '../listening/audio-source';
import { gradeListening } from '../listening/grading';
import { buildListeningItemForCard, collectKnownForms } from '../listening/session';
import { listeningOutcomeToRating } from '../../mapping';
import { Rating } from 'ts-fsrs';
import { seedStory } from './seed';

/** T81 / T85: the answer key is the form Mitch banked. «жахлива … жахливо» share lemma «жахливий». */
async function setup(bank: {
  surface: string;
  tokenIndex?: number;
  omitToken?: boolean;
  unread?: boolean;
}) {
  const db = createTestDb();
  const repos = createRepositories(db);
  await seedStory(db, {
    packId: 'p1',
    storyId: 'st1',
    sentences: [
      {
        id: 's0',
        uk: 'Жахлива ніч жахливо тиха',
        en: 'A terrible night, terribly quiet',
        lemmas: ['жахливий', 'ніч', 'жахливий', 'тихий'],
      },
    ],
  });
  const { item } = await repos.bank.addWord({
    lemma: 'жахливий',
    surface: bank.surface,
    translation: 'terrible',
    sentenceId: 's0',
    sourceStoryId: 'st1',
    ...(bank.omitToken ? {} : { tokenIndex: bank.tokenIndex }),
  });
  if (!bank.unread) await repos.reading.markFinished('p1', 'st1');
  return { db, repos, item };
}

/** The single context token flagged as the target (post-answer highlight). */
function targetText(audio: { context: { tokens: { text: string; isTarget: boolean }[] } | null }) {
  return audio.context?.tokens.filter((t) => t.isTarget).map((t) => t.text);
}

describe('T81/T85 resolver order (spoken = banked surface, context = keyed token)', () => {
  it('keys the encounter token (tokenIndex) even when it is the second lemma match', async () => {
    const { repos, item } = await setup({ surface: 'жахливо', tokenIndex: 2 });
    const audio = await resolveListeningAudio(repos, item);
    expect(audio).toMatchObject({ kind: 'tts', keySource: 'encounter', text: 'жахливо' });
    expect(targetText(audio)).toEqual(['жахливо']);
    expect(audio.context?.tokens[2]?.isTarget).toBe(true);
  });

  it('legacy item (no token_index) keys by surface fold, not the first lemma match', async () => {
    const { repos, item } = await setup({ surface: 'Жахливо', omitToken: true });
    const audio = await resolveListeningAudio(repos, item);
    expect(audio).toMatchObject({ keySource: 'surface', text: 'Жахливо' });
    expect(audio.context?.tokens[2]?.isTarget).toBe(true);
    expect(targetText(audio)).toEqual(['жахливо']);
  });

  it('lemma fallback: spoken = banked surface «жахливому», context highlights the lemma match «Жахлива»', async () => {
    const { repos, item } = await setup({ surface: 'жахливому', omitToken: true });
    const audio = await resolveListeningAudio(repos, item);
    expect(audio).toMatchObject({ kind: 'tts', keySource: 'lemma', text: 'жахливому' });
    expect(audio.context?.tokens[0]?.isTarget).toBe(true);
    expect(targetText(audio)).toEqual(['Жахлива']);
  });

  it('a stale token_index that points at a different word is ignored', async () => {
    const { repos, item } = await setup({ surface: 'жахливо', tokenIndex: 1 });
    const audio = await resolveListeningAudio(repos, item);
    expect(audio).toMatchObject({ keySource: 'surface', text: 'жахливо' });
    expect(targetText(audio)).toEqual(['жахливо']);
  });

  it('records token_index only alongside a sentence', async () => {
    const { db } = await setup({ surface: 'жахливо', tokenIndex: 2 });
    const rows = await db.select().from(encounters);
    expect(rows[0]!.tokenIndex).toBe(2);
  });
});

describe('T85 context + spoken text', () => {
  it('unread story: no context; spoken text is the banked surface, not the lemma', async () => {
    const { repos, item } = await setup({ surface: 'жахливо', tokenIndex: 2, unread: true });
    const audio = await resolveListeningAudio(repos, item);
    expect(audio).toEqual({ kind: 'tts', keySource: 'tts', text: 'жахливо', context: null });
  });

  it('ignores a stored listening.audioFlags row (retired by T85)', async () => {
    const { repos, item } = await setup({ surface: 'жахливо', tokenIndex: 2 });
    await repos.settings.set(SETTING_KEYS.listeningAudioFlags, {
      [item.id]: {
        packId: 'p1',
        packVersion: 1,
        sentenceId: 's0',
        tokenIndex: 2,
        trackId: 'tr1',
        flaggedAt: 1,
      },
    });
    const audio = await resolveListeningAudio(repos, item);
    expect(audio).toMatchObject({ kind: 'tts', keySource: 'encounter', text: 'жахливо' });
    expect(audio).not.toHaveProperty('flagged');
  });
});

describe('T81 gradeListening', () => {
  const forms = ['жахливий', 'жахлива', 'жахливо'];
  it('exact / form / wrong', () => {
    expect(gradeListening('Жахливо', 'жахливо', forms)).toBe('exact');
    expect(gradeListening('жахлива', 'жахливо', forms)).toBe('form');
    expect(gradeListening('жахливий', 'жахливо', forms)).toBe('form');
    expect(gradeListening('ніч', 'жахливо', forms)).toBe('wrong');
    expect(gradeListening('  ', 'жахливо', forms)).toBe('wrong');
  });
  it('Ukrainian: ґ/г and apostrophe fold, є/е stay distinct, stress mark ignored', () => {
    expect(gradeListening('ґанок', 'ганок', [])).toBe('exact');
    expect(gradeListening("п'ять", 'п’ять', [])).toBe('exact');
    expect(gradeListening('ме́ню', 'меню', [])).toBe('exact');
    expect(gradeListening('есе', 'єсе', [])).toBe('wrong');
  });
  it('form is correct but FSRS-capped at Hard; wrong is Again', () => {
    const base = { variant: 'typed' as const, replays: 0, slowReplays: 0, durationMs: 1000 };
    expect(listeningOutcomeToRating({ ...base, correct: true, match: 'exact' })).toBe(Rating.Good);
    expect(listeningOutcomeToRating({ ...base, correct: true, match: 'form' })).toBe(Rating.Hard);
    expect(listeningOutcomeToRating({ ...base, correct: false, match: 'wrong' })).toBe(
      Rating.Again,
    );
  });
  it('collectKnownForms gathers lemma, banked surface and pack forms', async () => {
    const { repos, item } = await setup({ surface: 'жахливо', tokenIndex: 2 });
    const known = await collectKnownForms(repos, item);
    expect(known).toEqual(expect.arrayContaining(['жахливий', 'жахливо', 'жахлива']));
  });
});

describe('T81 distractor rule', () => {
  it('never offers another form of the answer lemma', async () => {
    const { repos, item } = await setup({ surface: 'жахливо', tokenIndex: 2 });
    // lemma_norm is unique, so a sibling can only arrive mis-lemmatized: lemma «жахлива», surface «жахлива».
    await repos.bank.addWord({ lemma: 'жахлива', surface: 'жахлива', translation: 'dup' });
    for (const w of ['стол', 'окно', 'река', 'лес']) {
      await repos.bank.addWord({ lemma: w, surface: w, translation: w });
    }
    const card = (await repos.reviews.getCard(item.id, 'listening'))!;
    const entry = await buildListeningItemForCard(repos, card, item, 'pick4');
    expect(entry.variant).toBe('pick4');
    expect(entry.choices).not.toContain('жахлива');
    expect(entry.choices).toContain('жахливо');
  });
});
