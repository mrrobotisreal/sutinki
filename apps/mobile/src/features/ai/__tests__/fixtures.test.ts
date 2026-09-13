import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseEnrichmentCompletion } from '../enrichment-core';
import { buildEnrichmentMessages } from '../prompts/enrichment';
import { buildExplainMessages } from '../prompts/explain';
import { buildJournalFeedbackMessages } from '../prompts/journal-feedback';
import { parseFeedbackCompletion } from '../queue-core';
import {
  AssessmentResponseSchema,
  ExplainResponseSchema,
  extractJsonObject,
  parseStoredAssessment,
  parseStoredFeedback,
} from '../schemas';

/**
 * Recorded-fixture tests (ticket item 6): real OpenRouter responses
 * captured once by scripts/capture-ai-fixtures.ts, checked in, parsed here
 * with the exact production parsers — no live API in CI. If a prompt
 * template changes its response contract, regenerate the fixtures.
 */

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__');

function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(FIXTURES, name), 'utf8')) as T;
}

describe('prompt templates', () => {
  // Two very-early-A1 Ukrainian entries (UT04): one with a deliberate case
  // error («у мій кімната» → «у моїй кімнаті»), one with an apostrophe word.
  const A1_CASE_ERROR = 'Я сиджу у мій кімната. Тут темно.';
  const A1_APOSTROPHE = "У мене є п'ять котів. Моя сім'я вдома.";

  it('journal feedback: system pins the JSON contract + Ukrainian rules, user carries the entry verbatim', () => {
    const messages = buildJournalFeedbackMessages(A1_CASE_ERROR);
    expect(messages[0]!.role).toBe('system');
    for (const key of ['"corrected"', '"changes"', '"before"', '"after"', '"summary"']) {
      expect(messages[0]!.content).toContain(key);
    }
    expect(messages[0]!.content).toContain('Ukrainian tutor');
    expect(messages[0]!.content).toContain('very early A1');
    expect(messages[0]!.content).toContain('2019 правопис');
    expect(messages[0]!.content).not.toContain('Russian tutor');
    expect(messages[1]).toEqual({
      role: 'user',
      content: `My journal entry:\n\n${A1_CASE_ERROR}`,
    });
    // the apostrophe reaches the model untouched (U+0027 as typed)
    const withApostrophe = buildJournalFeedbackMessages(A1_APOSTROPHE);
    expect(withApostrophe[1]!.content).toContain("п'ять");
    expect(withApostrophe[1]!.content).toContain("сім'я");
  });

  it('enrichment: every item id and field reaches the user message', () => {
    const messages = buildEnrichmentMessages([
      { id: 'a1', kind: 'word', surface: 'словами', context: 'простими словами' },
      { id: 'b2', kind: 'phrase', surface: 'принаймні', translation: 'at least' },
      { id: 'c3', kind: 'word', surface: "п'яти", context: "о п'яти годині" },
    ]);
    const user = messages[1]!.content;
    expect(user).toContain('id: a1');
    expect(user).toContain('kind: word');
    expect(user).toContain('context: …простими словами…');
    expect(user).toContain('id: b2');
    expect(user).toContain('user translation: at least');
    expect(user).toContain("surface: п'яти");
    expect(messages[0]!.content).toContain('"items"');
    expect(messages[0]!.content).toContain('Ukrainian lexicographer');
    expect(messages[0]!.content).toContain('-ти');
  });

  it('explain: sentence and card variants render their context lines', () => {
    const sentence = buildExplainMessages({
      kind: 'sentence',
      uk: 'Уночі я чую стукіт.',
      en: 'At night I hear a knock.',
      sourceTitle: 'Стукіт у стіні',
    });
    expect(sentence[0]!.content).toContain('Ukrainian tutor');
    expect(sentence[1]!.content).toContain('Explain this Ukrainian sentence');
    expect(sentence[1]!.content).toContain('«Уночі я чую стукіт.»');
    expect(sentence[1]!.content).toContain('Стукіт у стіні');

    const card = buildExplainMessages({
      kind: 'card',
      headword: 'дзеркало',
      translation: 'mirror',
      pos: 'noun',
      exampleUk: 'Ми купили дивне дзеркало.',
    });
    expect(card[1]!.content).toContain('Explain this Ukrainian noun');
    expect(card[1]!.content).toContain('«дзеркало»');
    expect(card[1]!.content).toContain('Ми купили дивне дзеркало.');
  });
});

/**
 * The recorded completions below were captured at the fork against the
 * Russian prompts (their *content* is Russian study text). They still pin
 * the parser ↔ schema contract, which UT04 did not change; recapturing
 * them in Ukrainian needs a live OpenRouter key (`scripts/capture-ai-fixtures.ts`,
 * whose inputs are Ukrainian since UT04) — a human step, recorded in the ticket.
 */
describe('recorded fixtures parse with the production parsers', () => {
  it('journal feedback → StoredFeedback, and survives a DB round-trip', () => {
    const fx = fixture<{ entryUk: string; model: string; content: string }>(
      'journal-feedback.json',
    );
    const stored = parseFeedbackCompletion(fx.content, fx.entryUk, fx.model, 1_000);
    expect(stored.v).toBe(1);
    expect(stored.sourceUk).toBe(fx.entryUk);
    expect(stored.corrected.length).toBeGreaterThan(0);
    expect(stored.changes.length).toBeGreaterThan(0);
    for (const change of stored.changes) {
      expect(change.explanation.length).toBeGreaterThan(0);
    }
    // the exact string journal_entries.aiFeedback stores must read back
    expect(parseStoredFeedback(JSON.stringify(stored))).toEqual(stored);
  });

  it('enrichment (fence-wrapped in the wild) → proposals for every item', () => {
    const fx = fixture<{
      items: { id: string; kind: 'word' | 'phrase'; surface: string }[];
      content: string;
    }>('enrichment.json');
    const requested = fx.items.map((i) => ({ ...i, lemma: null }));
    const proposals = parseEnrichmentCompletion(fx.content, requested);
    expect(proposals.size).toBe(fx.items.length);
    for (const item of fx.items) {
      const p = proposals.get(item.id)!;
      expect(p.translation.length).toBeGreaterThan(0);
      if (item.kind === 'phrase') {
        expect(p.lemma).toBeUndefined();
        expect(p.pos).toBeUndefined();
      } else {
        expect(p.lemma).toBeTruthy();
      }
    }
  });

  it('explain → non-empty markdown', () => {
    const fx = fixture<{ content: string }>('explain-sentence.json');
    const parsed = ExplainResponseSchema.safeParse(fx.content.trim());
    expect(parsed.success).toBe(true);
  });

  it('assessment → all four skills + recommendations, and survives a DB round-trip', () => {
    const fx = fixture<{ model: string; content: string }>('assessment.json');
    const parsed = AssessmentResponseSchema.safeParse(extractJsonObject(fx.content));
    expect(parsed.success).toBe(true);
    const data = parsed.data!;
    for (const skill of ['reading', 'listening', 'writing', 'speaking'] as const) {
      expect(data.skills[skill].note.length).toBeGreaterThan(0);
    }
    expect(data.recommendations.length).toBeGreaterThanOrEqual(2);
    // the exact object assessments.payload stores must read back
    const stored = { ...data, v: 1 as const, model: fx.model, createdAt: 1_000 };
    expect(parseStoredAssessment(JSON.parse(JSON.stringify(stored)))).toEqual(stored);
  });
});
