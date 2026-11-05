import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';

import {
  allowedEdits,
  charDistance,
  PRONUNCIATION_HARD_SCORE,
  PRONUNCIATION_PASS_SCORE,
  pronunciationScoreToRating,
  scoreAttempt,
  scoringTokens,
  wordsMatch,
} from '../scoring';

/** T12: the lenient alignment scoring pipeline (design §6). */

describe('scoringTokens', () => {
  it('normalizes, lowercases, folds apostrophes/ґ and strips punctuation', () => {
    expect(scoringTokens("П'ять ґанків, дякую!")).toEqual(['пʼять', 'ганків', 'дякую']);
  });

  it('keeps in-word hyphens («кто-то» is one word)', () => {
    expect(scoringTokens('Кто-то стучит')).toEqual(['кто-то', 'стучит']);
  });

  it('handles « » quoting and em-dashes from story sentences', () => {
    expect(scoringTokens('«Иди сюда» — сказал он.')).toEqual(['иди', 'сюда', 'сказал', 'он']);
  });

  it('returns empty for empty/punctuation-only input', () => {
    expect(scoringTokens('')).toEqual([]);
    expect(scoringTokens('… — !')).toEqual([]);
  });
});

describe('charDistance / allowedEdits / wordsMatch', () => {
  it('computes plain Levenshtein', () => {
    expect(charDistance('дом', 'дом')).toBe(0);
    expect(charDistance('дом', 'том')).toBe(1);
    expect(charDistance('стена', 'стенах')).toBe(1);
  });

  it('short words must be exact, longer words earn edit budget', () => {
    expect(allowedEdits(3)).toBe(0);
    expect(allowedEdits(5)).toBe(1);
    expect(allowedEdits(8)).toBe(2);
    expect(allowedEdits(12)).toBe(3);
  });

  it('tolerates an ending slip on a long word but not a different short word', () => {
    expect(wordsMatch('фотография', 'фотографии')).toBe(true);
    expect(wordsMatch('дом', 'том')).toBe(false);
  });
});

describe('scoreAttempt', () => {
  it('perfect attempt scores 100 with every word green', () => {
    const r = scoreAttempt('Я чую стукіт у стіні', 'я чую стукіт у стіні');
    expect(r.score).toBe(100);
    expect(r.words.every((w) => w.matched)).toBe(true);
  });

  it('is apostrophe-, ґ/г-, case- and punctuation-tolerant (comparison only)', () => {
    const r = scoreAttempt("П'ять на ґанку.", 'пʼять на ганку');
    expect(r.score).toBe(100);
    // Display keeps the authored apostrophe and ґ for the UI.
    expect(r.words[0]!.display).toBe("П'ять");
    expect(r.words[2]!.display).toBe('ґанку');
  });

  it('a deliberately wrong word turns exactly that word red', () => {
    const r = scoreAttempt('Я чую стукіт у стіні', 'я чую голос у стіні');
    expect(r.words.map((w) => w.matched)).toEqual([true, true, false, true, true]);
    expect(r.words[2]!.heard).toBe('голос');
    expect(r.score).toBe(80);
  });

  it('missing words fail their slots without derailing the rest', () => {
    const r = scoreAttempt('Він відчинив старі двері', 'він відчинив двері');
    expect(r.matchedCount).toBe(3);
    const missed = r.words.find((w) => !w.matched)!;
    expect(missed.target).toBe('старі');
    expect(missed.heard).toBeNull();
  });

  it('extra transcript words never hurt the score', () => {
    const r = scoreAttempt('дім', 'ну дім так');
    expect(r.score).toBe(100);
  });

  it('empty transcript = zero, all red', () => {
    const r = scoreAttempt('Я чую стукіт', '');
    expect(r.score).toBe(0);
    expect(r.words.every((w) => !w.matched)).toBe(true);
  });
});

/**
 * UT06: what the Ukrainian ASR actually emits (bake-off, RESULTS.md) vs the
 * authored prompt. The NeMo transducer writes the apostrophe as U+0027 and
 * ґ as г or ґ — the normalize fold handles both; the cases below pin the
 * leniency decisions the ticket asked for.
 */
describe('Ukrainian ASR leniency (UT06)', () => {
  it("«п'ять» spoken → ASR «п’ять» (U+2019) and «пʼять» (U+02BC) both match via the apostrophe fold", () => {
    expect(wordsMatch(scoringTokens("п'ять")[0]!, scoringTokens('п’ять')[0]!)).toBe(true);
    expect(wordsMatch(scoringTokens("п'ять")[0]!, scoringTokens('пʼять')[0]!)).toBe(true);
  });

  it("«п'ять» spoken → ASR «пять» (apostrophe dropped) — DECISION: accepted at edit distance 1", () => {
    // «пʼять» (5 chars after folding) vs «пять» (4): allowedEdits(5) = 1, so the
    // dropped apostrophe is tolerated. Deliberate: the apostrophe marks a
    // glide the scorer cannot hear anyway; punishing its absence would punish
    // the ASR's spelling, not Mitch's mouth.
    expect(charDistance(scoringTokens("п'ять")[0]!, 'пять')).toBe(1);
    expect(wordsMatch(scoringTokens("п'ять")[0]!, 'пять')).toBe(true);
    expect(scoreAttempt("Всього п'ять кімнат.", 'всього пять кімнат').score).toBe(100);
  });

  it("«дев'ять» / «пам'ятаю» survive the ASR's own apostrophe (real bake-off transcripts)", () => {
    expect(scoreAttempt("Всього дев'ять кімнат.", "Всього дев'ять кімнат.").score).toBe(100);
    expect(scoreAttempt("Я не пам'ятаю, як.", "Я не пам'ятаю, як").score).toBe(100);
    expect(
      scoreAttempt("Істота з'їла три місяці мого життя.", "Істота з'їла три місяці мого життя.")
        .score,
    ).toBe(100);
  });

  it('ґ/г: «ґрати» ↔ «грати» match; «броти» red, «награти» forgiven (recorded)', () => {
    expect(wordsMatch(scoringTokens('ґрати')[0]!, scoringTokens('грати')[0]!)).toBe(true);
    const r = scoreAttempt('Я хапаю ґрати.', 'я хапаю грати');
    expect(r.score).toBe(100);
    expect(r.words[2]!.display).toBe('ґрати');
    // RECORDED LENIENCY (the bake-off's two real misses on this word):
    // «броти» = 2 edits at the 5-char budget of 1 → red (a different word);
    // «награти» = 2 edits, but the budget keys off the LONGER token (7 → 2)
    // by T12 design, so a padded-but-recognizable word is forgiven → green.
    expect(scoreAttempt('Я хапаю ґрати.', 'я хапаю броти').words[2]!.matched).toBe(false);
    expect(scoreAttempt('Я хапаю ґрати.', 'я хапаю награти').words[2]!.matched).toBe(true);
    expect(scoreAttempt('Я хапаю ґрати.', 'я хапаю двері').words[2]!.matched).toBe(false);
  });

  it('names: «Лінн», «Кріс», «Пітер» exact; short names get no edit budget («Ен» ≠ «Лінн»)', () => {
    expect(scoreAttempt('Моя дружина — Лінн.', 'моя дружина лінн').score).toBe(100);
    expect(scoreAttempt('Його звати Кріс.', 'його звати кріс').score).toBe(100);
    // Real bake-off transcript for c31: «Моя дружина Ен.» — Лінн (4 chars,
    // budget 1) vs ен = distance 3 → red. Correct: the name was not heard.
    expect(scoreAttempt('Моя дружина — Лінн.', 'Моя дружина Ен.').words[2]!.matched).toBe(false);
    // «Пітар» for «Пітер» (5 chars, budget 1, distance 1) passes — an ending slip.
    expect(scoreAttempt('Його звати Пітер.', 'Його звати Пітар.').score).toBe(100);
  });

  it("number-nouns from the stories: «сімка», «дев'ятка», «п'ятсот» align exactly", () => {
    expect(scoreAttempt('На дверях — сімка.', 'На дверях сімка.').score).toBe(100);
    expect(scoreAttempt("У конверті — п'ятсот доларів.", "у конверті п'ятсот доларів").score).toBe(
      100,
    );
    // Russian-leaning transcript (real c34 output): «пятьсот долларов» — п'ятсот
    // (7 chars, budget 2) vs пятьсот = distance 2 → passes; доларів vs долларов
    // = distance 2 (7 chars, budget 2) → passes. The multilingual model's
    // Russian drift on Russian-looking words is absorbed, by design.
    const r = scoreAttempt("У конверті — п'ятсот доларів.", 'У конверте пятьсот долларов');
    expect(r.words.map((w) => w.matched)).toEqual([true, true, true, true]);
  });
});

describe('pronunciationScoreToRating (the T12 mapping recorded in the ticket)', () => {
  it('≥80 Good · 50–79 Hard · <50 Again · Easy never emitted', () => {
    expect(pronunciationScoreToRating(100)).toBe(Rating.Good);
    expect(pronunciationScoreToRating(PRONUNCIATION_PASS_SCORE)).toBe(Rating.Good);
    expect(pronunciationScoreToRating(PRONUNCIATION_PASS_SCORE - 1)).toBe(Rating.Hard);
    expect(pronunciationScoreToRating(PRONUNCIATION_HARD_SCORE)).toBe(Rating.Hard);
    expect(pronunciationScoreToRating(PRONUNCIATION_HARD_SCORE - 1)).toBe(Rating.Again);
    expect(pronunciationScoreToRating(0)).toBe(Rating.Again);
  });
});
