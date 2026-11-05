import { renderCatalogForPrompt } from '@/features/word-forms/profile-core';
import type { ProfileLanguage } from '@/features/word-forms/profile-schema';

import type { ChatMessage } from '../client';

/**
 * Word-profile prompt (M16/T52, WORD_FORMS §6.1 — the system text is
 * VERBATIM from the design file). The section catalog block is rendered
 * from `SECTION_CATALOG` (profile-core.ts), never hand-copied, so the
 * prompt and the validator can never disagree. Response contract =
 * `WordProfileSchema` + `validateProfile`.
 */

export const LANGUAGE_NAMES: Record<ProfileLanguage, string> = {
  ru: 'Russian',
  uk: 'Ukrainian',
};

/** Per-language slots of the system template (Russian text stays verbatim for upstream merges). */
const LANGUAGE_SLOTS: Record<
  ProfileLanguage,
  {
    stressExample: string;
    stressRules: string;
    spellingRule: string;
    homograph: string;
    extraRules: string;
    facts: string;
  }
> = {
  ru: {
    stressExample: 'говори́ть',
    stressRules: 'Monosyllables and words whose stressed vowel is ё carry no mark.',
    spellingRule: 'Preserve ё wherever it belongs.',
    homograph: 'за́мок / замо́к',
    extraRules: '',
    facts:
      'aspect; aspect partner; conjugation class (I / II / irregular); stress pattern (fixed on stem / fixed on ending / mobile — say where it moves); transitivity; gender; animacy; declension type; short-form availability; register; frequency remark',
  },
  uk: {
    stressExample: 'чита́ти, вода́',
    stressRules:
      'EVERY word of two or more syllables carries exactly one mark on its stressed vowel (the vowels are а е є и і ї о у ю я); monosyllables carry none.',
    spellingRule:
      "Preserve ґ, ї, є, і and the apostrophe exactly as in standard spelling (п'ять, м'ясо, з'їсти) — never replace them with Russian ы э ъ ё.",
    homograph: 'за́мок / замо́к',
    extraRules: `
9. Use standard literary Ukrainian (Український правопис 2019). Never offer Russian or surzhyk forms; if a form exists only in Russian, put null. Prefer the Ukrainian spelling of loanwords. Seven cases exist, including the vocative (кличний); the locative is "місцевий" and is used only after prepositions (у, в, на, по, при, о).`,
    facts:
      'aspect; aspect partner; conjugation class (I -еш/-єш, II -иш/-їш, irregular); motion verb (unidirectional / multidirectional); stress pattern (fixed on stem / fixed on ending / mobile — say where it moves); transitivity; gender; animacy; declension group (I–IV) and stem (hard / soft / mixed); vocative formation; alternations (к/г/х→ц/з/с, о/е→і, fleeting vowels); register; frequency remark',
  },
};

const SYSTEM_TEMPLATE = `You are an expert {LANGUAGE_NAME} morphologist and language teacher. Produce a STRUCTURED reference profile of ONE {LANGUAGE_NAME} word or set phrase for an English-speaking adult learner (currently ~A1–A2, aiming for C1). Output exactly one JSON object matching the contract below — no prose, no markdown fences, no comments.

Hard rules
1. Every {LANGUAGE_NAME} form appears twice: "ru" WITH stress marks and "plain" WITHOUT. Stress mark = the combining acute accent U+0301 placed immediately after the stressed vowel ({STRESS_EXAMPLE}). {STRESS_RULES} "plain" must equal "ru" with every U+0301 removed. {SPELLING_RULE} Use NFC. Several alternative forms in one cell are joined with " / ".
2. Never invent a form. If a form does not exist for this word (no present passive participle, no plural, no short form, indeclinable), put null in that cell (grid) or omit the row (list) and explain in the section "note".
3. Include ONLY the sections that apply to the part of speech, in the catalog order, with the exact "id", "layout", "title" and (where marked FIXED) the exact "rowLabels" given. You may add extra sections only with an id starting "x-".
4. Glosses are short English (≤ 8 words). Notes are short English sentences. Flag register (colloquial, bookish, vulgar, dated, regional) in notes or tags.
5. If the headword is a homograph ({HOMOGRAPH}), profile the sense matching the learner's saved translation and mention the other reading in overview.notes.
6. For verbs, the family section lists the aspect partner first (tags ["partner","pf"] or ["partner","impf"]), then the most useful prefixed / derived verbs by real-life frequency (tags like ["pf","prefix:по-"]), reflexive counterparts (["refl"]), then nouns / adjectives / adverbs from the same root (["noun"], ["adj"], ["adv"]) — at most 14 rows in total, so choose by usefulness. Each row's gloss must carry the nuance, not just the base meaning.
7. Examples (row.example) must be sentences the learner would realistically meet in speech, chats, books or news — natural, not textbook-flat — with a faithful English rendering.
8. Keep the whole object under ~6 000 tokens. Prefer accuracy over completeness: an omitted rare form beats a wrong one.{EXTRA_RULES}

Contract (TypeScript-ish):
{ "v": 1, "language": "{LANGUAGE_CODE}", "kind": "word" | "phrase",
  "pos": "verb"|"noun"|"adj"|"adv"|"pron"|"num"|"prep"|"conj"|"part"|"name"|"phrase"|"other",
  "headword": { "ru": string, "plain": string },
  "overview": { "gloss": string, "facts": [{ "label": string, "value": string }], "notes": [string] },
  "sections": [ { "id": string, "title": { "en": string, "ru": string }, "layout": "grid"|"list",
                  "grid"?: { "rowLabels": [string], "colLabels": [string], "cells": [[ { "ru","plain","gloss"?,"note"? } | null ]] },
                  "rows"?: [ { "ru","plain","gloss","note"?,"tags"?:[string],"example"?:{ "ru","en" } } ],
                  "note"?: string } ] }

Overview facts to include when applicable: {FACTS}.

Section catalog (FIXED labels must be copied verbatim):
{CATALOG_RENDERED_FROM_SECTION_CATALOG}`;

/** The rendered system prompt for one language (exported for the prompt test). */
export function buildWordProfileSystem(language: ProfileLanguage): string {
  const name: string = LANGUAGE_NAMES[language];
  const slots = LANGUAGE_SLOTS[language];
  return SYSTEM_TEMPLATE.replaceAll('{STRESS_EXAMPLE}', slots.stressExample)
    .replaceAll('{STRESS_RULES}', slots.stressRules)
    .replaceAll('{SPELLING_RULE}', slots.spellingRule)
    .replaceAll('{HOMOGRAPH}', slots.homograph)
    .replaceAll('{EXTRA_RULES}', slots.extraRules)
    .replaceAll('{FACTS}', slots.facts)
    .replaceAll('{LANGUAGE_NAME}', name)
    .replaceAll('{LANGUAGE_CODE}', language)
    .replace('{CATALOG_RENDERED_FROM_SECTION_CATALOG}', renderCatalogForPrompt(language));
}

export interface WordProfileInput {
  language: ProfileLanguage;
  kind: 'word' | 'phrase';
  /** The lemma for words, the phrase text for phrases (spelling preserved, no stress marks). */
  headword: string;
  /** Surface form as first met — words only; the line is omitted when it equals the headword. */
  surface?: string | null;
  translation?: string | null;
  /** The bank item's grammar note about the surface form. */
  grammar?: string | null;
  pos?: string | null;
  level?: string | null;
  /** Up to 3 sentences the learner met the item in (the caller trims). */
  contexts?: string[];
}

/** The §6.1 user turn — lines omitted when their value is empty. */
export function buildWordProfileUserTurn(input: WordProfileInput): string {
  const lang = LANGUAGE_NAMES[input.language];
  const lines = [`Profile this ${lang} ${input.kind}: «${input.headword}»`];
  const translation = input.translation?.trim();
  if (translation) lines.push(`Saved translation: "${translation}"`);
  const surface = input.surface?.trim();
  if (input.kind === 'word' && surface && surface !== input.headword.trim()) {
    lines.push(`First met as the form «${surface}»`);
  }
  const grammar = input.grammar?.trim();
  if (grammar) lines.push(`Saved grammar note about that form: ${grammar}`);
  const pos = input.pos?.trim();
  if (pos) lines.push(`Saved part of speech: ${pos}`);
  const level = input.level?.trim();
  if (level) lines.push(`CEFR tag: ${level}`);
  const contexts = (input.contexts ?? []).map((c) => c.trim()).filter(Boolean);
  if (contexts.length > 0) {
    lines.push('Sentences I met it in:');
    for (const c of contexts) lines.push(`- «${c}»`);
  }
  lines.push('Return the JSON object only.');
  return lines.join('\n');
}

export function buildWordProfileMessages(input: WordProfileInput): ChatMessage[] {
  return [
    { role: 'system', content: buildWordProfileSystem(input.language) },
    { role: 'user', content: buildWordProfileUserTurn(input) },
  ];
}

/**
 * The ONE correction round (§5.5 step 3, T29's pattern): the model sees
 * what it wrote plus the exact validator issues, and returns the whole
 * corrected object.
 */
export function buildWordProfileCorrectionMessages(
  first: ChatMessage[],
  rawAnswer: string,
  issues: string[],
): ChatMessage[] {
  return [
    ...first,
    { role: 'assistant', content: rawAnswer },
    {
      role: 'user',
      content: [
        'Your JSON failed validation. Fix ONLY these issues and return the complete corrected JSON:',
        ...issues.map((issue) => `- ${issue}`),
      ].join('\n'),
    },
  ];
}
