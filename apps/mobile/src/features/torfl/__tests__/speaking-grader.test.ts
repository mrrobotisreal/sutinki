import {
  ExamSchema,
  type Exam,
  type Pack,
  type SpeakingMonologueItem,
  type SpeakingTurnItem,
} from '@sutinki/schema';
import examPackJson from '@sutinki/schema/fixtures/packs/a1-ukrexam-fixture/pack.json';
import { describe, expect, it } from 'vitest';

import { SPEAKING_RUBRICS, SPEAKING_TASK_POINTS, offlineMaxOf } from '../grading/rubrics';
import {
  PAUSE_CLAUSE_MS,
  countVerbs,
  estimateSentences,
  fluencyShare,
  fullAnswerThreshold,
  gradeMonologueOffline,
  gradeSpeakingOffline,
  gradeTurnOffline,
  itemTaskLabel,
  kindSlots,
  looksLikeVerb,
  offlineSpeakingPoints,
  responseShare,
  scoreSpeakingSubtest,
  speakingRubricKind,
  speakingTaskOf,
} from '../grading/speaking';
import type { SpeakingAnswer, SpeakingWordStamp } from '../model';

/**
 * UT17b (UKR_EXAM_PREP §2 Говоріння): the offline speaking grader over the Ukrainian fixture mock's speaking
 * section — the judge mapping (M17 `judgeAnswer`, language `uk`), the full-answer bonus, the
 * Whisper-vs-primary pick, cue coverage + the sentence estimate capped by verbs + fluency, and the Commission
 * shares 14 (photo) / 10 (monologue) / 14 (dialogue) of 38.
 */

const PACK = examPackJson as unknown as Pack;
const EXAM: Exam = ExamSchema.parse(PACK.exams!.find((e) => e.id === 'a1-mock-fx'));
const SPEAKING = EXAM.subtests.find((s) => s.kind === 'speaking')!;
const items = SPEAKING.parts.flatMap((p) => p.items);
const REPLY = items.find((i) => i.id === 'sp46') as SpeakingTurnItem;
const REPLY2 = items.find((i) => i.id === 'sp47') as SpeakingTurnItem;
const SITUATION: SpeakingTurnItem = { ...REPLY2, id: 'sit', kind: 'speaking-situation' };
const MONO = items.find((i) => i.id === 'sp45') as SpeakingMonologueItem;
const PHOTO = items.find((i) => i.id === 'sp44') as SpeakingMonologueItem;

const answer = (transcript: string, over: Partial<SpeakingAnswer> = {}): SpeakingAnswer => ({
  kind: 'speaking-reply',
  transcript,
  recordingPath: null,
  durationMs: 3000,
  ...over,
});

/** Evenly spaced stamps: one word every `stepMs`, `gapsAfter` word indexes get a long pause after them. */
function stamps(
  words: string[],
  stepMs: number,
  gapsAfter: number[] = [],
  pauseMs = 900,
): SpeakingWordStamp[] {
  const out: SpeakingWordStamp[] = [];
  let t = 0;
  words.forEach((w, i) => {
    out.push({ w, s: t, e: t + stepMs - 100 });
    t += stepMs;
    if (gapsAfter.includes(i)) t += pauseMs;
  });
  return out;
}

describe('rubric kinds + shares', () => {
  it('rubric kind by item: photo = a monologue with an image; dialogue = reply / situation', () => {
    expect(speakingRubricKind(REPLY)).toBe('dialogue');
    expect(speakingRubricKind(SITUATION)).toBe('dialogue');
    expect(speakingRubricKind(MONO)).toBe('monologue');
    expect(speakingRubricKind(PHOTO)).toBe('photo');
    expect(speakingTaskOf(REPLY)).toBe(1);
    expect(speakingTaskOf(SITUATION)).toBe(2);
    expect(speakingTaskOf(MONO)).toBe(3);
    expect(itemTaskLabel(PHOTO).uk).toBe('Опис фото');
    expect(itemTaskLabel(MONO).uk).toBe('Монолог');
    expect(itemTaskLabel(REPLY).en).toBe('Dialogue with the examiner');
    expect(kindSlots(SPEAKING)).toEqual({ photo: 1, monologue: 1, dialogue: 3 });
  });

  it('shares = Commission points 14 / 10 / 14 of 38; the three replies split the dialogue share', () => {
    expect(SPEAKING_TASK_POINTS).toEqual({ photo: 14, monologue: 10, dialogue: 14 });
    expect(SPEAKING.maxPoints).toBe(38);
    expect(responseShare(SPEAKING, PHOTO)).toBe(14);
    expect(responseShare(SPEAKING, MONO)).toBe(10);
    expect(responseShare(SPEAKING, REPLY)).toBeCloseTo(14 / 3, 3);
    const total =
      responseShare(SPEAKING, PHOTO) +
      responseShare(SPEAKING, MONO) +
      3 * responseShare(SPEAKING, REPLY);
    expect(total).toBeCloseTo(38, 2);
  });

  it('renormalised over the kinds a section has; scaled to maxPoints', () => {
    const noPhoto = { maxPoints: 38, parts: [{ items: [MONO, REPLY] }] };
    expect(responseShare(noPhoto, MONO)).toBeCloseTo((10 / 24) * 38, 2);
    expect(responseShare(noPhoto, REPLY)).toBeCloseTo((14 / 24) * 38, 2);
    expect(
      responseShare(
        SPEAKING,
        items.find((i) => i.kind !== 'speaking-reply' && !('prompt' in i))!,
      ),
    ).toBeGreaterThan(0);
  });
});

describe('dialogue replies (judge mapping, full-answer bonus)', () => {
  it('the full-answer threshold is calibrated to the model answer', () => {
    // minTokens 4; «Мене звати Оксана.» has 2 content tokens → threshold 2
    expect(REPLY.minTokens).toBe(4);
    expect(fullAnswerThreshold(REPLY)).toBe(2);
    expect(fullAnswerThreshold({ ...REPLY, minTokens: 1 })).toBe(1);
  });

  it('a matched full answer: content 29 + fullness 36 of 65 → 100 % provisional; AI parts pending', () => {
    const g = gradeTurnOffline(REPLY, answer('Мене звати Оксана'));
    expect(g.task).toBe(1);
    expect(g.rubric).toBe('dialogue');
    expect(g.criteria).toEqual([
      { id: 'content', score: 29, max: 29 },
      { id: 'fullness', score: 36, max: 36 },
    ]);
    expect(g.offlineMax).toBe(offlineMaxOf(SPEAKING_RUBRICS.dialogue));
    expect(g.offlineMax).toBe(65);
    expect(g.pct).toBe(100);
    expect(g.provisional).toBe(true);
    if (g.details.task !== 3) {
      expect(g.details.verdict).toBe('matched');
      expect(g.details.fullAnswer).toBe(true);
    }
  });

  it('a short «звати Оксана» still matches the slot; wrong content but a full sentence earns fullness only', () => {
    const g = gradeTurnOffline(REPLY, answer('я живу в Києві'));
    expect(g.criteria[0]!.score).toBe(0);
    expect(g.criteria[1]!.score).toBe(36);
    expect(g.pct).toBe(55.4);
  });

  it('«так» / «ні» / «не знаю» → 0 (miss, no full-answer bonus)', () => {
    for (const t of ['так', 'ні', 'не знаю', 'так так так так']) {
      const g = gradeTurnOffline(REPLY, answer(t));
      expect(g.criteria.map((c) => c.score)).toEqual([0, 0]);
      expect(g.pct).toBe(0);
    }
  });

  it('no speech → 0 everywhere with verdict no-speech', () => {
    const g = gradeTurnOffline(REPLY, answer(''));
    expect(g.pct).toBe(0);
    if (g.details.task !== 3) expect(g.details.verdict).toBe('no-speech');
  });

  it('the Whisper assist transcript wins when it judges better, and the row says so', () => {
    const g = gradeTurnOffline(
      REPLY,
      answer('я тут сиджу вдома', { assistTranscript: 'Мене звати Оксана.' }),
    );
    if (g.details.task !== 3) {
      expect(g.details.verdict).toBe('matched');
      expect(g.details.transcriptUsed).toBe('assist');
    }
    expect(g.pct).toBe(100);
    const same = gradeTurnOffline(
      REPLY,
      answer('Мене звати Оксана', { assistTranscript: 'я тут сиджу вдома' }),
    );
    if (same.details.task !== 3) expect(same.details.transcriptUsed).toBe('primary');
  });

  it('a situation item grades as the same dialogue rubric (task 2)', () => {
    const ok = gradeTurnOffline(SITUATION, answer('Скажіть, де ви живу'));
    expect(ok.task).toBe(2);
    expect(ok.rubric).toBe('dialogue');
    expect(ok.criteria.map((c) => c.id)).toEqual(['content', 'fullness']);
  });
});

describe('verbs + sentence estimate', () => {
  it('recognizes common Ukrainian verb forms and leaves nouns alone', () => {
    for (const v of [
      'живу',
      'працюю',
      'люблю',
      'звати',
      'вчуся',
      'читав',
      'був',
      'подобається',
      'хочу',
    ])
      expect(looksLikeVerb(v)).toBe(true);
    for (const n of ['київ', 'дім', 'квартира', 'мітч', 'колорадо', 'книги', 'і', 'в'])
      expect(looksLikeVerb(n)).toBe(false);
    expect(countVerbs(['я', 'живу', 'в', 'києві', 'і', 'працюю'])).toBe(2);
  });

  it('clauses split at pauses ≥ 600 ms, capped by verbs + 1', () => {
    const words = 'мене звати мітч я живу в києві я працюю в банку я люблю читати'.split(' ');
    const est = estimateSentences(words.join(' '), stamps(words, 300, [2, 6, 10]));
    expect(est.clauses).toBe(4);
    expect(est.verbs).toBe(5); // звати · живу · працюю · люблю · читати (the infinitive counts)
    expect(est.sentences).toBe(4);
    expect(est.words).toBe(14);
    expect(est.longestPauseMs).toBe(900 + 100);
    expect(PAUSE_CLAUSE_MS).toBe(600);
  });

  it('many pauses but few verbs: the verb cap holds the estimate down', () => {
    const words = 'київ дім квартира книги робота'.split(' ');
    const est = estimateSentences(words.join(' '), stamps(words, 300, [0, 1, 2, 3]));
    expect(est.clauses).toBe(5);
    expect(est.verbs).toBe(0);
    expect(est.sentences).toBe(1);
  });

  it('no stamps → the verb count alone; empty → zeros', () => {
    expect(estimateSentences('я живу в києві і я працюю', undefined).sentences).toBe(2);
    expect(estimateSentences('', undefined)).toMatchObject({ sentences: 0, words: 0, wpm: 0 });
  });

  it('a custom pause threshold changes the clause split', () => {
    const words = 'я живу тут я працюю там'.split(' ');
    // the helper's gap = 100 ms word spacing + the pause: 500 ms < 600 by default, ≥ 400 when lowered
    const st = stamps(words, 300, [2], 400);
    expect(estimateSentences(words.join(' '), st).clauses).toBe(1);
    expect(estimateSentences(words.join(' '), st, { pauseMs: 400 }).clauses).toBe(2);
  });

  it('fluency bands: fast + no long pause = 1; slow with a 5 s pause = 0; no stamps = neutral', () => {
    expect(fluencyShare({ wpm: 80, longestPauseMs: 500, words: 20 })).toBe(1);
    expect(fluencyShare({ wpm: 20, longestPauseMs: 5000, words: 20 })).toBe(0);
    expect(fluencyShare({ wpm: 50, longestPauseMs: 3000, words: 20 })).toBeCloseTo(
      0.6 * (2 / 3) + 0.2,
    );
    expect(fluencyShare({ wpm: 0, longestPauseMs: 0, words: 20 })).toBe(0.5);
    expect(fluencyShare({ wpm: 0, longestPauseMs: 0, words: 0 })).toBe(0);
  });
});

describe('monologue (task 47) and photo (task 46)', () => {
  const GOOD =
    'мене звати мітч я з америки я живу в колорадо я працюю програмістом я люблю читати книги мені подобається музика я хочу жити в києві я вчу українську мову щодня я думаю це цікаво';

  it('monologue: all four points covered, ≥ 8 sentences, fluent → content 40 + structure 20 of 60 → 100 %', () => {
    const words = GOOD.split(' ');
    const gaps = [2, 5, 9, 12, 16, 19, 24, 30, 33];
    const g = gradeMonologueOffline(MONO, answer(GOOD, { words: stamps(words, 350, gaps, 800) }));
    expect(g.task).toBe(3);
    expect(g.rubric).toBe('monologue');
    expect(g.offlineMax).toBe(60);
    expect(g.criteria.map((c) => c.id)).toEqual(['content', 'structure']);
    expect(g.criteria[0]!.score).toBe(40);
    if (g.details.task === 3) {
      expect(g.details.covered).toBe(4);
      expect(g.details.sentences).toBeGreaterThanOrEqual(8);
    }
    expect(g.criteria[1]!.score).toBe(20);
    expect(g.pct).toBe(100);
  });

  it('monologue: two points covered, short, no stamps → partial credit from the rubric data', () => {
    const g = gradeMonologueOffline(MONO, answer('мене звати мітч я живу в колорадо я працюю'));
    expect(g.criteria[0]!.score).toBe(30); // 3 of 4 points × 40
    expect(g.criteria[1]!.score).toBe(8.5); // (0.7 × 3/8 + 0.3 × 0.5) × 20 = 8.25, rounded to halves
    expect(g.pct).toBe(64.2);
    if (g.details.task === 3) {
      expect(g.details.coveredIdx).toEqual([0, 1, 3]);
      expect(g.details.missingIdx).toEqual([2]);
    }
  });

  it('photo uses the photo rubric (content 29 / structure 42) and its own offline max (71)', () => {
    const g = gradeMonologueOffline(
      PHOTO,
      answer('на фото люди вони в парк гуляють усі відчувають радість'),
    );
    expect(g.rubric).toBe('photo');
    expect(g.offlineMax).toBe(71);
    expect(g.criteria[0]).toEqual({ id: 'content', score: 29, max: 29 });
    expect(g.details).toMatchObject({ rubric: 'photo', covered: 4, total: 4 });
  });

  it('an empty monologue is 0; the assist transcript lifts coverage when it hears more cues', () => {
    expect(gradeMonologueOffline(MONO, answer('')).pct).toBe(0);
    const g = gradeMonologueOffline(
      MONO,
      answer('мене звати мітч', { assistTranscript: 'мене звати мітч я живу тут я люблю читати' }),
    );
    expect(g.criteria[0]!.score).toBe(30);
    if (g.details.task === 3) expect(g.details.transcriptUsed).toBe('assist');
  });
});

describe('section scoring (the computeFinish path)', () => {
  it('Σ pct × share over answered items, out of 38', () => {
    const answers = {
      [REPLY.id]: answer('Мене звати Оксана'),
      [MONO.id]: answer('мене звати мітч я живу в колорадо я працюю я люблю читати', {
        kind: 'speaking-monologue',
      }),
    };
    const r = scoreSpeakingSubtest(SPEAKING, answers);
    const expected =
      offlineSpeakingPoints(
        gradeSpeakingOffline(REPLY, answers[REPLY.id])!,
        responseShare(SPEAKING, REPLY),
      ) +
      offlineSpeakingPoints(
        gradeSpeakingOffline(MONO, answers[MONO.id])!,
        responseShare(SPEAKING, MONO),
      );
    expect(r.maxPoints).toBe(38);
    expect(r.points).toBeCloseTo(expected, 1);
    expect(r.pct).toBeCloseTo((r.points / 38) * 100, 0);
    expect(
      offlineSpeakingPoints(gradeSpeakingOffline(REPLY, answers[REPLY.id])!, 14 / 3),
    ).toBeCloseTo(4.7, 1);
  });

  it('nothing answered → 0 %; gradeSpeakingOffline is null for a non-speaking item', () => {
    expect(scoreSpeakingSubtest(SPEAKING, {}).pct).toBe(0);
    const choice = EXAM.subtests.find((s) => s.kind === 'listening')!.parts[0]!.items[0]!;
    expect(gradeSpeakingOffline(choice, undefined)).toBeNull();
  });
});
