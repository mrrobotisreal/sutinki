/**
 * Regenerate the recorded AI fixtures the T16 unit tests parse
 * (src/features/ai/__tests__/__fixtures__/). Run from apps/mobile:
 *
 *   OPENROUTER_API_KEY=… npx tsx scripts/capture-ai-fixtures.ts
 *
 * (or `set -a; source ../../.env; set +a` first — never paste the key.)
 *
 * Uses the SAME in-repo prompt builders the app ships, so the fixtures
 * always reflect the current templates. Responses contain only synthetic
 * study content — nothing personal, no secrets — and are safe to commit.
 * Tests never hit the network; this script is the only live caller.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildAssessmentMessages } from '../src/features/ai/prompts/assessment';
import { buildEnrichmentMessages } from '../src/features/ai/prompts/enrichment';
import { buildExplainMessages } from '../src/features/ai/prompts/explain';
import { buildImportAnnotateMessages } from '../src/features/ai/prompts/import-annotate';
import { buildJournalFeedbackMessages } from '../src/features/ai/prompts/journal-feedback';

const MODEL = 'anthropic/claude-sonnet-5';
const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/features/ai/__tests__/__fixtures__',
);

const key = process.env.OPENROUTER_API_KEY;
if (!key) {
  console.error('OPENROUTER_API_KEY is not set');
  process.exit(1);
}

/** Deliberately flawed very-early-A1 entry (UT04) — a case error, a Russianism, an apostrophe word. */
const JOURNAL_ENTRY = [
  'Вчора я іти в магазин з моя наречена.',
  "Ми купили п'ять яблук і один дивний дзеркало.",
  'Уночі я чув стук в стіні, але я не боюся темноти.',
].join(' ');

const ENRICHMENT_ITEMS = [
  {
    id: 'fx-word-1',
    kind: 'word' as const,
    surface: 'словами',
    context: 'Він говорив простими словами, але я все одно не зрозумів.',
  },
  {
    id: 'fx-word-2',
    kind: 'word' as const,
    surface: 'нагорі',
    translation: 'upstairs',
    context: 'Хтось ходить нагорі, але будинок порожній.',
  },
  {
    id: 'fx-phrase-1',
    kind: 'phrase' as const,
    surface: 'принаймні',
    context: 'Принаймні, двері були зачинені.',
  },
];

/** Synthetic-but-plausible T18 assessment bundle (sparse early-days data). */
const ASSESSMENT_BUNDLE = {
  stats: {
    'A1 lemmas encountered / collected / reviewed-shaky / young / mature': '140 / 14 / 12 / 2 / 0',
    'A2 lemmas encountered / collected / reviewed-shaky / young / mature': '27 / 4 / 4 / 0 / 0',
    'Grammar topics in installed content': 42,
    'Grammar topics seen in reading / with reviewed vocabulary': '30 / 18',
    'Total reviews completed': 65,
    'Total reading time (minutes)': 60,
    'Stories finished': 5,
    'Current activity streak (days)': 2,
    'Pronunciation attempts / average score (0-100, speech-recognition match)': '14 / 92',
    'Checkpoint a1-checkpoint-001': '100% (passed)',
  },
  journal: [
    {
      uk: "Вчора я іти в магазин з моя наречена. Ми купили п'ять яблук і один дивний дзеркало. Уночі я чув стук в стіні, але я не боюся темноти.",
      corrected:
        "Вчора я ходив у магазин зі своєю нареченою. Ми купили п'ять яблук і одне дивне дзеркало. Уночі я чув стукіт у стіні, але я не боюся темряви.",
      createdAt: Date.UTC(2026, 7, 21),
    },
  ],
};

/**
 * T29 import-annotation batch: conversational + literary + the recorded
 * edge cases (name, latin brand, digits, emoji, «» quotes) in one batch so
 * the fixture exercises the whole token contract.
 */
const IMPORT_SENTENCES = [
  { id: 'c1', uk: 'Привіт, коханий!' },
  {
    id: 'c2',
    uk: 'Ми з мамою купили продукти в магазині «Сільпо» і замовили піцу через Glovo.',
  },
  { id: 'c3', uk: "Приходь до нас о 19:30, буде смачний борщ і п'ять вареників 🙂" },
  { id: 'c4', uk: 'Леся Українка писала: «Contra spem spero!» — і сиділа на ґанку.' },
];

async function chat(messages: unknown, maxTokens: number): Promise<unknown> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature: 0.3 }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function slim(raw: unknown): { model: string; content: string } {
  // Persist only the envelope slice the app consumes — no ids/usage/etc.
  const body = raw as { model?: string; choices: { message: { content: string } }[] };
  return { model: body.model ?? MODEL, content: body.choices[0]!.message.content };
}

/** Optional filter: `npx tsx scripts/capture-ai-fixtures.ts assessment` recaptures one fixture. */
const ONLY = process.argv[2];
const wants = (name: string) => !ONLY || ONLY === name;

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  if (wants('journal-feedback')) {
    console.log('capturing journal feedback…');
    const feedback = slim(await chat(buildJournalFeedbackMessages(JOURNAL_ENTRY), 4096));
    writeFileSync(
      join(OUT_DIR, 'journal-feedback.json'),
      JSON.stringify({ entryUk: JOURNAL_ENTRY, ...feedback }, null, 2),
    );
  }

  if (wants('enrichment')) {
    console.log('capturing enrichment…');
    const enrichment = slim(await chat(buildEnrichmentMessages(ENRICHMENT_ITEMS), 4096));
    writeFileSync(
      join(OUT_DIR, 'enrichment.json'),
      JSON.stringify({ items: ENRICHMENT_ITEMS, ...enrichment }, null, 2),
    );
  }

  if (wants('explain')) {
    console.log('capturing explain (sentence)…');
    const explain = slim(
      await chat(
        buildExplainMessages({
          kind: 'sentence',
          uk: 'Уночі я чую стукіт у стіні.',
          en: 'At night I hear a knocking in the wall.',
        }),
        1024,
      ),
    );
    writeFileSync(join(OUT_DIR, 'explain-sentence.json'), JSON.stringify(explain, null, 2));
  }

  if (wants('assessment')) {
    console.log('capturing assessment…');
    const assessment = slim(await chat(buildAssessmentMessages(ASSESSMENT_BUNDLE), 2048));
    writeFileSync(
      join(OUT_DIR, 'assessment.json'),
      JSON.stringify({ bundle: ASSESSMENT_BUNDLE, ...assessment }, null, 2),
    );
  }

  if (wants('import-annotate')) {
    console.log('capturing import annotation…');
    const annotate = slim(await chat(buildImportAnnotateMessages(IMPORT_SENTENCES), 8192));
    writeFileSync(
      join(OUT_DIR, 'import-annotate.json'),
      JSON.stringify({ sentences: IMPORT_SENTENCES, ...annotate }, null, 2),
    );
  }

  console.log(`done → ${OUT_DIR}`);
}

void main();
