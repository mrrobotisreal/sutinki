import { z } from 'zod';
import { CefrLevelSchema, LocalizedTextSchema, RelativePathSchema, StableIdSchema } from './common';
import { ExpectationSchema, slotFormIssue } from './scenario';

/**
 * The `exam` pack type (T67, M18, design TORFL_EXAM_PREP §3, ADR-0020): one
 * or more structured tests — exam → subtests → parts → items — in either
 * `mock` mode (a faithful timed ТРКИ) or `drill` mode (practice). Reading
 * passages, listening scripts, examiner lines and model answers are ORDINARY
 * annotated stories in the same pack; items only *reference* them through
 * {@link StoryRefSchema} (resolved at the pack level — `pack.ts` — so this
 * schema stays self-contained and the app can `ExamSchema.parse` a stored
 * exam without its pack). Speaking items reuse the M17 `ExpectationSchema`
 * verbatim.
 */

export const EXAM_SUBTEST_KINDS = [
  'writing',
  'lexgram',
  'reading',
  'listening',
  'speaking',
] as const;
export const ExamSubtestKindSchema = z.enum(EXAM_SUBTEST_KINDS);
export type ExamSubtestKind = z.infer<typeof ExamSubtestKindSchema>;
/** Official SPbU order of a full TORFL mock (§1.3 decision 7). */
export const TORFL_SUBTEST_ORDER = EXAM_SUBTEST_KINDS;
/**
 * Order of the four parts of a `ukr-state` mock: Слухання · Читання · Письмо ·
 * Говоріння, 25 % each; there is NO `lexgram` part [exam-doc p1] [reg20 IV.4]
 * (UKR_EXAM_PREP §2, §5). `lexgram` stays a legal subtest kind for study-only
 * drills, never in a `ukr-state` mock.
 */
export const UKR_STATE_SUBTEST_ORDER = ['listening', 'reading', 'writing', 'speaking'] as const;

/** `torfl` = Sumrak's TORFL engine format (kept parseable); `ukr-state` = the Ukrainian state exam (UT16). */
export const EXAM_FORMATS = ['torfl', 'ukr-state'] as const;
export const ExamFormatSchema = z.enum(EXAM_FORMATS);
export type ExamFormat = z.infer<typeof ExamFormatSchema>;

/** Subtests scored by points per item (choice / typed); the others are rubric %. */
export const OBJECTIVE_SUBTEST_KINDS: readonly ExamSubtestKind[] = [
  'lexgram',
  'reading',
  'listening',
];

/** Points to a story (passage / listening script / examiner line / model answer) in the SAME pack. */
export const StoryRefSchema = z.strictObject({
  storyId: StableIdSchema,
  /** A contiguous run of the story's sentences; absent = the whole story. */
  sentenceIds: z.array(StableIdSchema).min(1).optional(),
  /** Which audio track plays (listening / examiner prompts); absent = the story's first track. */
  trackId: StableIdSchema.optional(),
});
export type StoryRef = z.infer<typeof StoryRefSchema>;

const ItemBase = {
  id: StableIdSchema,
  /** §3.4 topic slug — the app owns the label set; unknown slugs render raw. */
  topic: StableIdSchema,
  /** Overrides the subtest's `pointsPerItem` (objective items only). */
  points: z.number().positive().optional(),
  /** Why the answer is right — shown after answering in drills, in review after a mock. English, may quote Russian. */
  explain: z.string().min(1).optional(),
};

/**
 * Display hint for a `choice` item (UT16, UKR_EXAM_PREP §5) — no new scoring.
 * `true-false` = Правда/Неправда (exactly 2 options); `true-false-ns` = 3 options
 * (… / не сказано); `gap-word` / `gap-form` = the cloze kinds of reading
 * tasks 29–33 / 34–38 (word choice / word form; the stem has the gap).
 */
export const CHOICE_VARIANTS = ['true-false', 'true-false-ns', 'gap-word', 'gap-form'] as const;
export const ChoiceVariantSchema = z.enum(CHOICE_VARIANTS);
export type ChoiceVariant = z.infer<typeof ChoiceVariantSchema>;

/** A–Г single choice (А/Б/В at A1–B1 listening). `stem` may contain one «…» gap. */
export const ChoiceItemSchema = z.strictObject({
  ...ItemBase,
  kind: z.literal('choice'),
  variant: ChoiceVariantSchema.optional(),
  stem: z.string().min(1),
  /** EN gloss of the stem for drills' "show translation" (never shown in a mock). */
  stemEn: z.string().optional(),
  options: z.array(z.string().min(1)).min(2).max(4),
  answer: z.number().int().min(0),
  /** Reading: the passage; listening: the audio + transcript. */
  passage: StoryRefSchema.optional(),
  audio: StoryRefSchema.optional(),
});
export type ChoiceItem = z.infer<typeof ChoiceItemSchema>;

/** Free-text answer (listening info capture, drill cloze without options). */
export const TypedItemSchema = z.strictObject({
  ...ItemBase,
  kind: z.literal('typed'),
  /** «Тамара Иванова родилась (где?)» */
  prompt: z.string().min(1),
  /** Full credit (normalized through the Ukrainian fold, trailing-* stem globs allowed). */
  accept: z.array(z.string().min(1)).min(1),
  /** Half credit: right meaning, wrong form (demo v1's 2.5 of 5). */
  half: z.array(z.string().min(1)).optional(),
  passage: StoryRefSchema.optional(),
  audio: StoryRefSchema.optional(),
});
export type TypedItem = z.infer<typeof TypedItemSchema>;

/** Письмо: one letter task. */
export const WritingItemSchema = z.strictObject({
  ...ItemBase,
  kind: z.literal('writing'),
  /** The situation («Напишите письмо родителям…»). */
  task: LocalizedTextSchema,
  /** The bullet points to cover (`bullets`, not `points` — `points` is the score field); `cues` = stem globs whose presence marks the point covered offline. */
  bullets: z
    .array(
      z.strictObject({
        id: StableIdSchema,
        text: LocalizedTextSchema,
        cues: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1)
    .max(15),
  /** Statements + questions together (`torfl`: ≥ 5 and ≥ 3 bullets; `ukr-state`: ≥ 1). */
  minSentences: z.number().int().min(1),
  minQuestions: z.number().int().min(0).default(0),
  maxQuestions: z.number().int().optional(),
  /** `ukr-state` word limits (task 44: 20–50 at B1; task 45: ≥ 100). Absent = not word-limited. */
  minWords: z.number().int().positive().optional(),
  maxWords: z.number().int().positive().optional(),
  /** The model letter (a story in the pack, narrated). */
  model: StoryRefSchema.optional(),
});
export type WritingItem = z.infer<typeof WritingItemSchema>;

/**
 * A picture for a photo-description speaking item (UT16, UKR_EXAM_PREP §5,
 * task 46): a pack-relative image file. The pack `files` list ships it; the
 * in-app display waits for UT16b-exam-item-images.
 */
export const ExamImageSchema = z.strictObject({
  file: RelativePathSchema.refine((f) => /\.(png|jpe?g|webp)$/i.test(f), {
    message: 'an exam image is a .png, .jpg, .jpeg or .webp file',
  }),
  /** Plain-text description (accessibility + what a speaker should mention). */
  alt: z.string().min(1),
});
export type ExamImage = z.infer<typeof ExamImageSchema>;

/**
 * Matching (UT16, UKR_EXAM_PREP §5): `left[i]` ↔ `right[key[i]]`. Headings
 * (n of m — `right` has unused extras: 5-of-7 at B1) and question↔answer
 * (6↔6) are the same shape. One point per correct pair (partial credit); an
 * item's `points` overrides the default `pointsPerItem × left.length`.
 */
export const MatchingItemSchema = z.strictObject({
  ...ItemBase,
  kind: z.literal('matching'),
  variant: z.enum(['headings', 'qa']).optional(),
  stem: z.string().min(1),
  stemEn: z.string().optional(),
  left: z.array(z.string().min(1)).min(2).max(10),
  right: z.array(z.string().min(1)).min(2).max(12),
  /** `key[i]` = index into `right` that `left[i]` matches (0-based; injective). */
  key: z.array(z.number().int().min(0)).min(2).max(10),
  passage: StoryRefSchema.optional(),
});
export type MatchingItem = z.infer<typeof MatchingItemSchema>;

/** Scoring tasks an item stands for: a matching item = one per pair, everything else 1. */
export function examItemTasks(item: ExamItem): number {
  return item.kind === 'matching' ? item.left.length : 1;
}

/** Говорение task 1 (reply) and task 2 (situation: the candidate starts). */
export const SpeakingTurnItemSchema = z.strictObject({
  ...ItemBase,
  kind: z.enum(['speaking-reply', 'speaking-situation']),
  /** The examiner's line / the situation as read aloud (audio + text). */
  prompt: StoryRefSchema,
  /** Situation text shown on screen (task 2 only; the real tester reads it aloud — both). */
  situation: LocalizedTextSchema.optional(),
  /** Optional picture (photo description). */
  image: ExamImageSchema.optional(),
  /** Reuses M17 verbatim: slots + accept paraphrases; accept[0] is the model answer. */
  expect: ExpectationSchema,
  /** «да / нет / не знаю» is not a full answer: minimum content tokens for full credit. */
  minTokens: z.number().int().min(1).default(4),
});
export type SpeakingTurnItem = z.infer<typeof SpeakingTurnItemSchema>;

/** Говорение task 3: monologue. Two items sharing `group` = «choose one of two topics». */
export const SpeakingMonologueItemSchema = z.strictObject({
  ...ItemBase,
  kind: z.literal('speaking-monologue'),
  group: StableIdSchema.optional(),
  /** «О себе» / «Мой дом» */
  topicTitle: LocalizedTextSchema,
  questions: z
    .array(z.strictObject({ uk: z.string().min(1), cues: z.array(z.string().min(1)).min(1) }))
    .min(4)
    .max(12),
  minSentences: z.number().int().default(10),
  maxSentences: z.number().int().default(12),
  prepSec: z.number().int().default(480),
  answerSec: z.number().int().default(120),
  model: StoryRefSchema.optional(),
  /** `ukr-state` photo description (task 46): the picture to describe. */
  image: ExamImageSchema.optional(),
});
export type SpeakingMonologueItem = z.infer<typeof SpeakingMonologueItemSchema>;

export const ExamItemSchema = z.discriminatedUnion('kind', [
  ChoiceItemSchema,
  TypedItemSchema,
  MatchingItemSchema,
  WritingItemSchema,
  SpeakingTurnItemSchema,
  SpeakingMonologueItemSchema,
]);
export type ExamItem = z.infer<typeof ExamItemSchema>;
export type ExamItemKind = ExamItem['kind'];

export const ExamPartSchema = z.strictObject({
  id: StableIdSchema,
  /** The official-style instruction («Завдання 1–12. Оберіть правильну відповідь.»). */
  instructions: LocalizedTextSchema,
  items: z.array(ExamItemSchema).min(1),
  /** Speaking: part time budget (task 1 = 300, task 2 = 300, task 3 = 600). */
  timeSec: z.number().int().positive().optional(),
});
export type ExamPart = z.infer<typeof ExamPartSchema>;

export const ExamSubtestSchema = z.strictObject({
  id: StableIdSchema,
  kind: ExamSubtestKindSchema,
  /** «Лексика. Грамматика» */
  title: LocalizedTextSchema,
  /** Official instruction screen text (time, item count, dictionary rule). */
  instructions: LocalizedTextSchema,
  durationMin: z.number().int().positive(),
  dictionary: z.boolean(),
  /** 'free' = jump between items (paper exam); 'linear' = forward only (listening, speaking). */
  navigation: z.enum(['free', 'linear']),
  /** Objective subtests. */
  pointsPerItem: z.number().positive().optional(),
  /** §1.3 decision 5. */
  maxPoints: z.number().positive(),
  /** Listening: how many times each audio plays in a mock (official: 2). */
  audioPlays: z.number().int().min(1).max(3).optional(),
  parts: z.array(ExamPartSchema).min(1),
});
export type ExamSubtest = z.infer<typeof ExamSubtestSchema>;

/** Item kinds each subtest kind may hold (§3.2 invariant 2). */
const KINDS_BY_SUBTEST: Record<ExamSubtestKind, readonly ExamItemKind[]> = {
  lexgram: ['choice', 'typed'],
  reading: ['choice', 'typed', 'matching'],
  listening: ['choice', 'typed'],
  writing: ['writing'],
  speaking: ['speaking-reply', 'speaking-situation', 'speaking-monologue'],
};

/** Fill-in gap markers in a choice stem: «…» (U+2026), ASCII "...", or a run of ≥ 3 underscores. */
const GAP_RE = /…|\.\.\.|_{3,}/g;

/** Count the gaps in a stem (§3.2 invariant 3: at most one). */
export function countStemGaps(stem: string): number {
  return stem.match(GAP_RE)?.length ?? 0;
}

/** Option normalization for the uniqueness check: NFC, lower-case, collapsed spaces. */
function normalizeOption(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Points an objective item is worth: its own `points`, else the subtest's `pointsPerItem`, else 0. */
export function itemPoints(subtest: Pick<ExamSubtest, 'pointsPerItem'>, item: ExamItem): number {
  if (item.points !== undefined) return item.points;
  return (subtest.pointsPerItem ?? 0) * examItemTasks(item);
}

/**
 * The audio ref an item plays (§3.2 invariant 5): its own `audio`, else — one
 * dialogue → several questions — the FIRST item of its part's `audio`.
 * Undefined for items with no audio at either place (and for non-choice/typed
 * kinds, whose audio is their `prompt`). T70/T71 use this; never re-derive.
 */
export function resolveItemAudio(
  part: Pick<ExamPart, 'items'>,
  itemIdx: number,
): StoryRef | undefined {
  const item = part.items[itemIdx];
  if (item === undefined) return undefined;
  if ((item.kind === 'choice' || item.kind === 'typed') && item.audio !== undefined) {
    return item.audio;
  }
  if (item.kind !== 'choice' && item.kind !== 'typed') return undefined;
  const first = part.items[0];
  return first !== undefined && (first.kind === 'choice' || first.kind === 'typed')
    ? first.audio
    : undefined;
}

export type ExamRefField = 'passage' | 'audio' | 'prompt' | 'model';

/** One story ref inside an exam, with its path relative to the exam. */
export interface ExamStoryRef {
  ref: StoryRef;
  field: ExamRefField;
  subtestId: string;
  itemId: string;
  path: (string | number)[];
}

/** Every story ref an exam carries, in declaration order (refs as authored — inheritance not applied). */
export function examStoryRefs(exam: Exam): ExamStoryRef[] {
  const out: ExamStoryRef[] = [];
  exam.subtests.forEach((subtest, si) => {
    subtest.parts.forEach((part, pi) => {
      part.items.forEach((item, ii) => {
        const base = ['subtests', si, 'parts', pi, 'items', ii];
        const push = (field: ExamRefField, ref: StoryRef | undefined) => {
          if (ref !== undefined) {
            out.push({
              ref,
              field,
              subtestId: subtest.id,
              itemId: item.id,
              path: [...base, field],
            });
          }
        };
        if (item.kind === 'choice' || item.kind === 'typed') {
          push('passage', item.passage);
          push('audio', item.audio);
        } else if (item.kind === 'matching') {
          push('passage', item.passage);
        } else if (item.kind === 'writing' || item.kind === 'speaking-monologue') {
          push('model', item.model);
        } else {
          push('prompt', item.prompt);
        }
      });
    });
  });
  return out;
}

/** Walk every string under `value` (skipping `{uk, en}` LocalizedText pairs, which check themselves). */
function walkStrings(
  value: unknown,
  path: (string | number)[],
  visit: (s: string, path: (string | number)[]) => void,
): void {
  if (typeof value === 'string') {
    visit(value, path);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walkStrings(v, [...path, i], visit));
  } else if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 2 && keys.includes('uk') && keys.includes('en')) return;
    for (const [k, v] of Object.entries(value)) walkStrings(v, [...path, k], visit);
  }
}

/** The raw (pre-refinement) exam shape. */
const ExamShape = z.strictObject({
  id: StableIdSchema,
  /** `torfl` (Sumrak's engine, kept parseable) or `ukr-state` (UT16: the Ukrainian state exam). */
  format: ExamFormatSchema,
  level: CefrLevelSchema,
  mode: z.enum(['mock', 'drill']),
  /** «Зразок 1» / «Місцевий відмінок» */
  title: LocalizedTextSchema,
  /** Drills: a one-line EN description for the hub card. */
  blurb: z.string().optional(),
  subtests: z.array(ExamSubtestSchema).min(1),
});

/**
 * One exam. Invariants (TORFL §3.2 items 1–9), path-precise — T68–T74 and the
 * CT sessions debug against these:
 *
 * 1. subtest ids unique per exam; part ids unique per subtest; item ids
 *    unique per exam; every string NFC;
 * 2. kind compatibility — lexgram/reading/listening hold only choice/typed,
 *    a writing part exactly one writing item, speaking only speaking kinds;
 * 3. `choice.answer < options.length`; options unique after normalization;
 *    at most one gap («…», "...", "___") per stem;
 * 4. objective subtests: `pointsPerItem` set or every item has `points`;
 *    Σ item points == `maxPoints` (±0.001); `points` only on objective items;
 * 5. listening: every item has `audio` or inherits its part's first item's
 *    (so a part's first item needs one); `audioPlays` on listening subtests
 *    of `mock` exams;
 * 6. (reading passages may be omitted — not judged; refs resolve at pack level);
 * 8. `speaking-situation` has `situation`; monologue groups have exactly 2
 *    members; `minSentences ≤ maxSentences`;
 * 9. writing `minQuestions ≤ maxQuestions`; bullet ids unique per item; every
 *    cue (writing bullets, monologue questions, speaking `expect` slot forms)
 *    passes the M17 slot-form rule (NFC, punctuation-free, trailing-`*` only).
 *
 * UT16 additions: 3b matching keys are one-to-one into `right` (extras allowed);
 * `choice.variant` fixes the option/gap count; a `ukr-state` mock has no
 * lexgram subtest; the TORFL-only writing floors (≥ 3 bullets, ≥ 5 sentences)
 * apply to `format: 'torfl'` only.
 *
 * Invariant 7 (refs resolve) lives in `PackSchema`; invariant 10 (official
 * shape) is the non-fatal {@link officialShapeIssues}.
 */
export const ExamSchema = ExamShape.superRefine((exam, ctx) => {
  const issue = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: 'custom', path, message });

  // --- 1. NFC everywhere ------------------------------------------------
  walkStrings(exam, [], (s, path) => {
    if (s !== s.normalize('NFC')) issue(path, 'text must be UTF-8 NFC-normalized');
  });

  // --- 1. ids -----------------------------------------------------------
  const subtestIds = new Set<string>();
  const itemIds = new Map<string, string>();
  const groups = new Map<string, { count: number; path: (string | number)[] }>();
  exam.subtests.forEach((subtest, si) => {
    const sp = ['subtests', si];
    if (subtestIds.has(subtest.id)) issue([...sp, 'id'], `duplicate subtest id "${subtest.id}"`);
    subtestIds.add(subtest.id);

    if (exam.format === 'ukr-state' && exam.mode === 'mock' && subtest.kind === 'lexgram') {
      issue(
        [...sp, 'kind'],
        `a ukr-state mock has no lexgram part (Слухання · Читання · Письмо · Говоріння) — lexical-grammar drills are study-only`,
      );
    }
    const objective = OBJECTIVE_SUBTEST_KINDS.includes(subtest.kind);
    const allowed = KINDS_BY_SUBTEST[subtest.kind];
    const partIds = new Set<string>();
    let total = 0;
    let unpriced = false;

    subtest.parts.forEach((part, pi) => {
      const pp = [...sp, 'parts', pi];
      if (partIds.has(part.id)) {
        issue([...pp, 'id'], `duplicate part id "${part.id}" in subtest "${subtest.id}"`);
      }
      partIds.add(part.id);

      // --- 2. kind compatibility ------------------------------------------
      if (subtest.kind === 'writing' && part.items.length !== 1) {
        issue(
          [...pp, 'items'],
          `a writing part holds exactly one writing item (part "${part.id}" has ${part.items.length})`,
        );
      }

      part.items.forEach((item, ii) => {
        const ip = [...pp, 'items', ii];
        const seenIn = itemIds.get(item.id);
        if (seenIn !== undefined) {
          issue(
            [...ip, 'id'],
            `duplicate item id "${item.id}" (already used in subtest "${seenIn}") — item ids are unique per exam`,
          );
        }
        itemIds.set(item.id, subtest.id);

        if (!allowed.includes(item.kind)) {
          issue(
            [...ip, 'kind'],
            `a ${subtest.kind} subtest holds only ${allowed.join(' / ')} items (item "${item.id}" is ${item.kind})`,
          );
        }

        // --- 4. points ------------------------------------------------------
        if (objective) {
          if (item.points === undefined && subtest.pointsPerItem === undefined) unpriced = true;
          total += itemPoints(subtest, item);
        } else if (item.points !== undefined) {
          issue(
            [...ip, 'points'],
            `"points" is the objective score field — ${subtest.kind} items are scored by rubric % against the subtest's maxPoints`,
          );
        }

        // --- 3b. matching (UT16) ------------------------------------------------
        if (item.kind === 'matching') {
          if (item.key.length !== item.left.length) {
            issue(
              [...ip, 'key'],
              `matching key has ${item.key.length} entries but left has ${item.left.length} — one right-index per left item`,
            );
          }
          const used = new Set<number>();
          item.key.forEach((k, ki) => {
            if (k >= item.right.length) {
              issue(
                [...ip, 'key', ki],
                `key ${k} is out of range for ${item.right.length} right items (0-based)`,
              );
            } else if (used.has(k)) {
              issue([...ip, 'key', ki], `right item ${k} is matched twice — keys are one-to-one`);
            }
            used.add(k);
          });
          if (item.right.length < item.left.length) {
            issue(
              [...ip, 'right'],
              `right has ${item.right.length} items for ${item.left.length} left items — extras are allowed, a shortage is not`,
            );
          }
          const seenSides = new Map<string, number>();
          item.right.forEach((r, ri) => {
            const norm = normalizeOption(r);
            const prev = seenSides.get(norm);
            if (prev !== undefined) {
              issue([...ip, 'right', ri], `right item "${r}" duplicates right item ${prev}`);
            }
            seenSides.set(norm, ri);
          });
        }

        // --- 3. choice --------------------------------------------------------
        if (item.kind === 'choice') {
          if (item.variant === 'true-false' && item.options.length !== 2) {
            issue(
              [...ip, 'options'],
              `a true-false item has exactly 2 options (found ${item.options.length})`,
            );
          }
          if (item.variant === 'true-false-ns' && item.options.length !== 3) {
            issue(
              [...ip, 'options'],
              `a true-false-ns item has exactly 3 options (found ${item.options.length})`,
            );
          }
          if (
            (item.variant === 'gap-word' || item.variant === 'gap-form') &&
            countStemGaps(item.stem) !== 1
          ) {
            issue([...ip, 'stem'], `a ${item.variant} item's stem has exactly one gap`);
          }
          if (item.answer >= item.options.length) {
            issue(
              [...ip, 'answer'],
              `answer ${item.answer} is out of range for ${item.options.length} options (0-based)`,
            );
          }
          const seen = new Map<string, number>();
          item.options.forEach((option, oi) => {
            const norm = normalizeOption(option);
            const prev = seen.get(norm);
            if (prev !== undefined) {
              issue(
                [...ip, 'options', oi],
                `option "${option}" duplicates option ${prev} (after normalization)`,
              );
            }
            seen.set(norm, oi);
          });
          const gaps = countStemGaps(item.stem);
          if (gaps > 1) {
            issue(
              [...ip, 'stem'],
              `a stem has at most one gap («…», "..." or "___") — found ${gaps}`,
            );
          }
        }

        // --- 5. listening audio ---------------------------------------------
        if (
          subtest.kind === 'listening' &&
          (item.kind === 'choice' || item.kind === 'typed') &&
          resolveItemAudio(part, ii) === undefined
        ) {
          issue(
            [...ip, 'audio'],
            ii === 0
              ? `listening item "${item.id}" has no audio — the first item of a listening part must carry one`
              : `listening item "${item.id}" has no audio and its part's first item has none to inherit`,
          );
        }

        // --- 8. speaking ------------------------------------------------------
        if (item.kind === 'speaking-situation' && item.situation === undefined) {
          issue([...ip, 'situation'], `a speaking-situation item needs its "situation" text`);
        }
        if (item.kind === 'speaking-reply' || item.kind === 'speaking-situation') {
          item.expect.slots.forEach((slot, sli) => {
            if (slot.kind !== 'forms') return;
            slot.options.forEach((opt, oi) => {
              opt.forms.forEach((form, fi) => {
                const formIssue = slotFormIssue(form);
                if (formIssue !== null) {
                  issue([...ip, 'expect', 'slots', sli, 'options', oi, 'forms', fi], formIssue);
                }
              });
            });
          });
        }
        if (item.kind === 'speaking-monologue') {
          if (item.minSentences > item.maxSentences) {
            issue(
              [...ip, 'minSentences'],
              `minSentences ${item.minSentences} exceeds maxSentences ${item.maxSentences}`,
            );
          }
          if (item.group !== undefined) {
            const g = groups.get(item.group);
            if (g) g.count += 1;
            else groups.set(item.group, { count: 1, path: [...ip, 'group'] });
          }
          item.questions.forEach((q, qi) => {
            q.cues.forEach((cue, ci) => {
              const cueIssue = slotFormIssue(cue);
              if (cueIssue !== null)
                issue([...ip, 'questions', qi, 'cues', ci], cueIssue.replace(/^form/, 'cue'));
            });
          });
        }

        // --- 9. writing -------------------------------------------------------
        if (item.kind === 'writing') {
          if (exam.format === 'torfl') {
            if (item.bullets.length < 3) {
              issue([...ip, 'bullets'], `a torfl writing item needs at least 3 bullets`);
            }
            if (item.minSentences < 5) {
              issue([...ip, 'minSentences'], `a torfl writing item needs minSentences ≥ 5`);
            }
          }
          if (
            item.minWords !== undefined &&
            item.maxWords !== undefined &&
            item.minWords > item.maxWords
          ) {
            issue(
              [...ip, 'minWords'],
              `minWords ${item.minWords} exceeds maxWords ${item.maxWords}`,
            );
          }
          if (item.maxQuestions !== undefined && item.minQuestions > item.maxQuestions) {
            issue(
              [...ip, 'minQuestions'],
              `minQuestions ${item.minQuestions} exceeds maxQuestions ${item.maxQuestions}`,
            );
          }
          const bulletIds = new Set<string>();
          item.bullets.forEach((bullet, bi) => {
            if (bulletIds.has(bullet.id)) {
              issue(
                [...ip, 'bullets', bi, 'id'],
                `duplicate bullet id "${bullet.id}" in item "${item.id}"`,
              );
            }
            bulletIds.add(bullet.id);
            bullet.cues.forEach((cue, ci) => {
              const cueIssue = slotFormIssue(cue);
              if (cueIssue !== null)
                issue([...ip, 'bullets', bi, 'cues', ci], cueIssue.replace(/^form/, 'cue'));
            });
          });
        }
      });
    });

    // --- 4. Σ points == maxPoints ---------------------------------------------
    if (objective) {
      if (unpriced) {
        issue(
          [...sp, 'pointsPerItem'],
          `objective subtest "${subtest.id}" needs "pointsPerItem" or "points" on every item`,
        );
      } else if (Math.abs(total - subtest.maxPoints) > 0.001) {
        issue(
          [...sp, 'maxPoints'],
          `item points add up to ${+total.toFixed(3)} but subtest "${subtest.id}" declares maxPoints ${subtest.maxPoints}`,
        );
      }
    }

    // --- 5. audioPlays on mock listening -------------------------------------
    if (subtest.kind === 'listening' && exam.mode === 'mock' && subtest.audioPlays === undefined) {
      issue(
        [...sp, 'audioPlays'],
        `a mock's listening subtest must set "audioPlays" (official: 2)`,
      );
    }
  });

  // --- 8. monologue groups of exactly two ----------------------------------
  for (const [group, { count, path }] of groups) {
    if (count !== 2) {
      issue(
        path,
        `monologue group "${group}" has ${count} member${count === 1 ? '' : 's'} — «choose one of two topics» needs exactly 2`,
      );
    }
  }
});
export type Exam = z.infer<typeof ExamSchema>;

/**
 * The shape of one `ukr-state` level (UT16, UKR_EXAM_PREP §2). Sections are
 * ORDERED (`sections` array order = the order of a mock's subtests); a level
 * may omit any kind (no `ukr-state` shape has `lexgram`). `items` counts
 * scoring TASKS: a `matching` item counts one per pair ({@link examItemTasks}),
 * so reading B1 = 31 tasks over 6 texts. Percentages, not raw points, decide
 * the verdict (UT17): `weights` and `pass` are data only here.
 */
export interface UkrStateSection {
  kind: ExamSubtestKind;
  /** Scoring tasks (matching pairs counted individually). */
  items: number;
  /** Objective: Σ points (1 per task); rubric: the official rubric maximum. */
  maxPoints: number;
  durationMin: number;
  dictionary: boolean;
  navigation: 'free' | 'linear';
  /** Listening: plays per recording [exam-doc p1]. */
  audioPlays?: number;
  /** Section weight in the final percentage. */
  weightPct: number;
  /** Writing / speaking: the number of parts (one task each). */
  parts?: number;
  /** Writing / speaking: per-part time budget in seconds, in part order. */
  partTimes?: readonly number[];
  /** Writing: per-part word limits (a part's single writing item must carry them). */
  words?: readonly { min: number; max?: number }[];
  /** Speaking: the three tasks in part order — photo · monologue · dialogue. */
  speakingTasks?: {
    photoPhrases: number;
    monologuePhrases: { min: number; max: number };
    dialogueReplies: number;
  };
}

export interface ExamOfficialShape {
  /** Which instrument the numbers describe. */
  form: 'citizenship' | 'officials';
  /** True where UKR_EXAM_PREP §2 says the level is modelled («за зразком державного іспиту»). */
  modelled: boolean;
  sections: readonly UkrStateSection[];
  pass: { totalPct: number; perSectionMinPct?: number };
  /** Total time cap [reg409 п.36] (informational; Σ section minutes ≤ it). */
  capMin: number;
}

/**
 * B1 — the official citizenship form (UKR_EXAM_PREP §2 B1). Provenance:
 * counts [exam-doc p1–6]; points [reg20 IV.1]; minutes [reg20 III.7]; weights
 * 25 % [exam-doc p1] [reg20 IV.4]; pass ≥ 70 %, no per-part minimum
 * [reg20 IV.4–5] [roz §5]; cap 150 min [reg409 п.36]. Dictionary / navigation
 * are NOT stated in §2: [modelled: computer exam — listening and speaking
 * linear, reading and writing free, no dictionary].
 */
export const UKR_STATE_B1_SHAPE = {
  form: 'citizenship',
  modelled: false,
  capMin: 150, // [reg409 п.36]
  pass: { totalPct: 70 }, // [reg20 IV.4–5] [roz §5] — no perSectionMinPct
  sections: [
    {
      kind: 'listening',
      items: 12, // [exam-doc p1] tasks 1–12
      maxPoints: 12, // [reg20 IV.1] 1 per task
      durationMin: 15, // [reg20 III.7]
      dictionary: false, // [modelled: not stated]
      navigation: 'linear', // [modelled: not stated]
      audioPlays: 2, // [exam-doc p1] each recording heard twice
      weightPct: 25, // [exam-doc p1] [reg20 IV.4]
    },
    {
      kind: 'reading',
      items: 31, // [exam-doc p2–4] tasks 13–43; [prep] 31 items
      maxPoints: 31, // [reg20 IV.1] 1 per correspondence / item
      durationMin: 60, // [reg20 III.7]
      dictionary: false, // [modelled: not stated]
      navigation: 'free', // [modelled: not stated]
      weightPct: 25,
    },
    {
      kind: 'writing',
      items: 2, // [exam-doc p4–5] tasks 44–45
      maxPoints: 33, // [reg20 IV.1] 44 = 10, 45 = 23
      durationMin: 40, // [reg20 III.7] = 15 + 25
      dictionary: false, // [modelled: not stated]
      navigation: 'free', // [modelled: not stated]
      weightPct: 25,
      parts: 2,
      partTimes: [900, 1500], // [reg20 III.7] 15 min + 25 min
      words: [{ min: 20, max: 50 }, { min: 100 }], // [exam-doc p4–5] 44: 20–50; [prog §Письмо] 45: ≥ 100
    },
    {
      kind: 'speaking',
      items: 3, // [exam-doc p5–6] tasks 46–48
      maxPoints: 38, // [reg20 IV.1] 14 + 10 + 14
      durationMin: 35, // [reg20 III.7] = 10 + 10 + 15
      dictionary: false, // [modelled: not stated]
      navigation: 'linear', // [modelled: not stated]
      weightPct: 25,
      parts: 3,
      // part order photo · monologue · dialogue: 46 = 10 min, 47 = 15 min, 48 = 10 min [reg20 III.7]
      partTimes: [600, 900, 600],
      speakingTasks: {
        photoPhrases: 10, // [exam-doc p5–6] task 46: 10 phrases
        monologuePhrases: { min: 20, max: 25 }, // task 47: 20–25 phrases
        dialogueReplies: 5, // task 48: 5 answers
      },
    },
  ],
} as const satisfies ExamOfficialShape;

/**
 * A2 — modelled («за зразком державного іспиту»), UKR_EXAM_PREP §2 A2: the B1
 * form scaled by the Standard's descriptor ratios. Rubric maxima as B1; pass
 * 70 % [modelled: B1 rule applied]. Speaking part times: B1 ratio ≈ 0.65 in
 * the B1 time order (46, 48, 47 = 6 + 7 + 10 = 23 min) → in part order
 * photo · monologue · dialogue = 6 / 10 / 7 min [modelled: §2 lists
 * "6 + 7 + 10" in B1's 46·48·47 order].
 */
export const UKR_STATE_A2_SHAPE = {
  form: 'citizenship',
  modelled: true,
  capMin: 150, // [reg409 п.36]
  pass: { totalPct: 70 }, // [modelled: same instrument form]
  sections: [
    {
      kind: 'listening',
      items: 10, // [modelled: 4 MC3 + 6 Правда/Неправда]
      maxPoints: 10,
      durationMin: 11, // [modelled: 15 × 10/12]
      dictionary: false, // [modelled]
      navigation: 'linear', // [modelled]
      audioPlays: 2, // [modelled: as B1]
      weightPct: 25, // [modelled: as B1]
    },
    {
      kind: 'reading',
      items: 22, // [modelled: 3 headings + 4 T/F + 5 Q↔A + 5 gap-word + 5 gap-form]
      maxPoints: 22,
      durationMin: 45, // [modelled: 60 × 22/31 ≈ 43 → 45]
      dictionary: false, // [modelled]
      navigation: 'free', // [modelled]
      weightPct: 25,
    },
    {
      kind: 'writing',
      items: 2, // [modelled]
      maxPoints: 33, // [modelled: rubric weights as B1]
      durationMin: 25, // [modelled: 40 × 0.6]
      dictionary: false, // [modelled]
      navigation: 'free', // [modelled]
      weightPct: 25,
      parts: 2,
      partTimes: [600, 900], // [modelled: 10 + 15]
      words: [
        { min: 15, max: 35 },
        { min: 50, max: 70 },
      ], // [modelled: 44: 15–35; 45: 50–70]
    },
    {
      kind: 'speaking',
      items: 3,
      maxPoints: 38, // [modelled: rubric weights as B1]
      durationMin: 23, // [modelled: 6 + 7 + 10]
      dictionary: false, // [modelled]
      navigation: 'linear', // [modelled]
      weightPct: 25,
      parts: 3,
      partTimes: [360, 600, 420], // [modelled: photo 6, monologue 10, dialogue 7 min]
      speakingTasks: {
        photoPhrases: 7, // [modelled]
        monologuePhrases: { min: 12, max: 15 }, // [modelled]
        dialogueReplies: 4, // [modelled: 8–10 turns ↔ 4 replies]
      },
    },
  ],
} as const satisfies ExamOfficialShape;

/**
 * A1 — modelled («за зразком державного іспиту»), UKR_EXAM_PREP §2 A1.
 * Total ≈ 76 min [modelled]. Speaking part times photo 5 · dialogue 5 ·
 * monologue 8 (§2 "5 + 5 + 8 = 18" in B1's 46·48·47 order) → part order
 * photo · monologue · dialogue = 5 / 8 / 5 min [modelled].
 */
export const UKR_STATE_A1_SHAPE = {
  form: 'citizenship',
  modelled: true,
  capMin: 150, // [reg409 п.36]
  pass: { totalPct: 70 }, // [modelled: B1 rule applied to the same instrument form]
  sections: [
    {
      kind: 'listening',
      items: 8, // [modelled: 4 MC3 + 4 Правда/Неправда]
      maxPoints: 8,
      durationMin: 8, // [modelled]
      dictionary: false, // [modelled]
      navigation: 'linear', // [modelled]
      audioPlays: 2, // [modelled: "each recording twice"]
      weightPct: 25,
    },
    {
      kind: 'reading',
      items: 16, // [modelled: 3 headings + 4 T/F + 4 Q↔A + 3 gap + 2 MC4]
      maxPoints: 16,
      durationMin: 30, // [modelled: 60 × 16/31 ≈ 31]
      dictionary: false, // [modelled]
      navigation: 'free', // [modelled]
      weightPct: 25,
    },
    {
      kind: 'writing',
      items: 2, // [modelled]
      maxPoints: 33, // [modelled: rubric weights as B1]
      durationMin: 20, // [modelled: 40 × 0.5]
      dictionary: false, // [modelled]
      navigation: 'free', // [modelled]
      weightPct: 25,
      parts: 2,
      partTimes: [480, 720], // [modelled: 8 + 12]
      words: [
        { min: 10, max: 25 },
        { min: 30, max: 50 },
      ], // [modelled: 44: 10–25; 45: 30–50]
    },
    {
      kind: 'speaking',
      items: 3,
      maxPoints: 38, // [modelled: rubric weights as B1]
      durationMin: 18, // [modelled: 5 + 5 + 8]
      dictionary: false, // [modelled]
      navigation: 'linear', // [modelled]
      weightPct: 25,
      parts: 3,
      partTimes: [300, 480, 300], // [modelled: photo 5, monologue 8, dialogue 5 min]
      speakingTasks: {
        photoPhrases: 5, // [modelled]
        monologuePhrases: { min: 8, max: 10 }, // [modelled]
        dialogueReplies: 3, // [modelled: 4–6 turns ↔ 3 replies]
      },
    },
  ],
} as const satisfies ExamOfficialShape;

/**
 * B2 — the *officials'* instrument seen as a score band, NOT the citizenship
 * form (UKR_EXAM_PREP §2 B2/C1): written block 60 min = 30 min tests + 20 min
 * open writing + 10 min oral [off-form 2024] [reg20 III.7]; weights 40 / 30 /
 * 30 [reg20 IV.6]; tests 30 tasks 1 point each [reg20 IV.1]; writing rubric 37,
 * oral rubric 18. Level by total: 60–69 % = B2 [reg20 IV.7–12]. The shelf is
 * empty (ADR-0011); the constant exists so the level profile can state the
 * threshold. The `reading` section stands for the combined tests block.
 */
export const UKR_STATE_B2_SHAPE = {
  form: 'officials',
  modelled: false,
  capMin: 60, // [off-form 2024]
  pass: { totalPct: 60 }, // [reg20 IV.7–12] B2 band floor
  sections: [
    {
      kind: 'reading',
      items: 30, // [off-form 2024] tests 1–30
      maxPoints: 30, // [reg20 IV.1]
      durationMin: 30, // [off-form 2024]
      dictionary: false, // [modelled]
      navigation: 'free', // [modelled]
      weightPct: 40, // [reg20 IV.6]
    },
    {
      kind: 'writing',
      items: 1, // [off-form 2024] listen ≤ 4 min ×2, write 100–150 words
      maxPoints: 37, // [reg20 IV.1]
      durationMin: 20, // [off-form 2024]
      dictionary: false, // [modelled]
      navigation: 'free', // [modelled]
      weightPct: 30, // [reg20 IV.6]
      parts: 1,
      partTimes: [1200],
      words: [{ min: 100, max: 150 }], // [off-form 2024]
    },
    {
      kind: 'speaking',
      items: 1, // [off-form 2024] monologue on one of two themes, ≥ 20 sentences
      maxPoints: 18, // [reg20 IV.1]
      durationMin: 10, // [off-form 2024]
      dictionary: false, // [modelled]
      navigation: 'linear', // [modelled]
      weightPct: 30, // [reg20 IV.6]
    },
  ],
} as const satisfies ExamOfficialShape;

/** C1 — as B2; band 70–89 % = C1 [reg20 IV.7–12]. */
export const UKR_STATE_C1_SHAPE = {
  ...UKR_STATE_B2_SHAPE,
  pass: { totalPct: 70 }, // [reg20 IV.7–12] C1 band floor
} as const satisfies ExamOfficialShape;

/** Level → `ukr-state` shape. Every level has one (B2/C1 are the officials' bands, shelves empty). */
export const UKR_STATE_SHAPES: Readonly<Record<Exam['level'], ExamOfficialShape>> = {
  A1: UKR_STATE_A1_SHAPE,
  A2: UKR_STATE_A2_SHAPE,
  B1: UKR_STATE_B1_SHAPE,
  B2: UKR_STATE_B2_SHAPE,
  C1: UKR_STATE_C1_SHAPE,
};

/** The shape one TORFL level is checked against (T75). Writing `parts` = writing parts, each one writing item. */
export interface TorflOfficialShape {
  lexgram: {
    items: number;
    maxPoints: number;
    durationMin: number;
    dictionary: boolean;
    navigation: 'free' | 'linear';
  };
  reading: {
    items: number;
    maxPoints: number;
    durationMin: number;
    dictionary: boolean;
    navigation: 'free' | 'linear';
  };
  listening: {
    items: number;
    maxPoints: number;
    durationMin: number;
    dictionary: boolean;
    navigation: 'free' | 'linear';
    audioPlays: number;
  };
  /** `parts` = writing parts; `secondTopic` = the topic the 2nd writing item must carry (A2 note task). */
  writing: { durationMin: number; dictionary: boolean; parts: number; secondTopic?: string };
  /** `monologue` (A2): the LAST speaking part holds exactly `count` monologue(s), ungrouped, with these explicit windows. */
  speaking: {
    durationMin: number;
    navigation: 'free' | 'linear';
    partTimes: readonly number[];
    monologue?: { count: number; prepSec: number; answerSec: number };
  };
}

/** The official A1 numbers (TORFL §2, demo v2) — the one place they live. */
export const TORFL_A1_SHAPE = {
  lexgram: { items: 70, maxPoints: 70, durationMin: 40, dictionary: false, navigation: 'free' },
  reading: { items: 25, maxPoints: 100, durationMin: 40, dictionary: true, navigation: 'free' },
  listening: {
    items: 20,
    maxPoints: 100,
    durationMin: 30,
    dictionary: false,
    navigation: 'linear',
    audioPlays: 2,
  },
  writing: { durationMin: 30, dictionary: true, parts: 1 },
  speaking: { durationMin: 20, navigation: 'linear', partTimes: [300, 300, 600] },
} as const satisfies TorflOfficialShape;

/** The official A2 (ТБУ) numbers — demo v2 (2022), TORFL_A2_EXAM_PREP §2.1. */
export const TORFL_A2_SHAPE = {
  lexgram: { items: 100, maxPoints: 100, durationMin: 50, dictionary: false, navigation: 'free' },
  reading: { items: 30, maxPoints: 180, durationMin: 50, dictionary: true, navigation: 'free' },
  listening: {
    items: 25,
    maxPoints: 150,
    durationMin: 30,
    dictionary: false,
    navigation: 'linear',
    audioPlays: 2,
  },
  writing: { durationMin: 50, dictionary: true, parts: 2, secondTopic: 'write-note' },
  speaking: {
    durationMin: 25,
    navigation: 'linear',
    partTimes: [300, 300, 900],
    monologue: { count: 1, prepSec: 600, answerSec: 300 },
  },
} as const satisfies TorflOfficialShape;

/** Level → official shape; a level without an entry is never shape-checked. */
export const TORFL_SHAPES: Readonly<Partial<Record<Exam['level'], TorflOfficialShape>>> = {
  A1: TORFL_A1_SHAPE,
  A2: TORFL_A2_SHAPE,
};

/**
 * Invariant 10 — the official-shape check (non-fatal; `validate` prints it).
 * For a `mock` with `format: 'torfl'` at a level with a {@link TORFL_SHAPES}
 * entry (A1, A2):
 * - the five subtests in {@link TORFL_SUBTEST_ORDER};
 * - A1: lexgram 70 items / 70 points / 40 min, reading 25 / 100 / 40, listening
 *   20 / 100 / 30 with `audioPlays: 2`, writing 30 min, speaking 20 min with
 *   parts 300 / 300 / 600 s;
 * - A2: lexgram 100 / 100 / 50 min, reading 30 / 180 / 50, listening 25 / 150 /
 *   30 with `audioPlays: 2`, writing 50 min in 2 parts (the 2nd topic
 *   `write-note`), speaking 25 min with parts 300 / 300 / 900 s and task 3 = one
 *   ungrouped monologue with `prepSec: 600`, `answerSec: 300`;
 * - the dictionary rule (decision 8) and navigation (free for paper subtests,
 *   linear for listening and speaking).
 * Returns `⚠ official-shape: …` lines, `[]` when conforming, when the exam is
 * a drill, another format, or a level without a shape. Pure; never throws.
 */
export function officialShapeIssues(exam: Exam): string[] {
  if (exam.mode !== 'mock') return [];
  if (exam.format === 'ukr-state') return ukrStateShapeIssues(exam);
  if (exam.format !== 'torfl') return [];
  const shape = TORFL_SHAPES[exam.level];
  if (!shape) return [];
  const out: string[] = [];
  const warn = (msg: string) => out.push(`⚠ official-shape: ${msg}`);

  const kinds = exam.subtests.map((s) => s.kind);
  if (kinds.join(',') !== TORFL_SUBTEST_ORDER.join(',')) {
    warn(
      `subtests are [${kinds.join(', ')}] — the official order is [${TORFL_SUBTEST_ORDER.join(', ')}]`,
    );
  }

  for (const subtest of exam.subtests) {
    const label = `${subtest.kind} "${subtest.id}"`;
    const items = subtest.parts.reduce((n, p) => n + p.items.length, 0);
    const check = (what: string, got: unknown, want: unknown) => {
      if (got !== want) warn(`${label} ${what} ${String(got)} — official ${String(want)}`);
    };
    switch (subtest.kind) {
      case 'lexgram':
      case 'reading':
      case 'listening': {
        const want = shape[subtest.kind];
        check('has items', items, want.items);
        check('maxPoints', subtest.maxPoints, want.maxPoints);
        check('durationMin', subtest.durationMin, want.durationMin);
        check('dictionary', subtest.dictionary, want.dictionary);
        check('navigation', subtest.navigation, want.navigation);
        if (subtest.kind === 'listening') {
          check('audioPlays', subtest.audioPlays, shape.listening.audioPlays);
        }
        break;
      }
      case 'writing': {
        check('durationMin', subtest.durationMin, shape.writing.durationMin);
        check('dictionary', subtest.dictionary, shape.writing.dictionary);
        check('has parts', subtest.parts.length, shape.writing.parts);
        const second = shape.writing.secondTopic;
        if (second !== undefined && subtest.parts.length >= 2) {
          const first = subtest.parts[1]!.items[0];
          if (first?.kind !== 'writing' || first.topic !== second) {
            const topic = first && 'topic' in first ? first.topic : undefined;
            warn(`${label} part 2 topic ${topic ?? '—'} — official ${second}`);
          }
        }
        break;
      }
      case 'speaking': {
        check('durationMin', subtest.durationMin, shape.speaking.durationMin);
        check('navigation', subtest.navigation, shape.speaking.navigation);
        const times = subtest.parts.map((p) => p.timeSec ?? '—');
        const want = shape.speaking.partTimes;
        if (times.join('/') !== want.join('/')) {
          warn(`${label} part times are ${times.join('/')} s — official ${want.join('/')} s`);
        }
        const mono = shape.speaking.monologue;
        const last = subtest.parts[subtest.parts.length - 1];
        if (mono && last) {
          const monos = last.items.filter(
            (i): i is SpeakingMonologueItem => i.kind === 'speaking-monologue',
          );
          if (monos.length !== mono.count) {
            warn(`${label} task 3 has ${monos.length} monologue(s) — official ${mono.count}`);
          }
          for (const m of monos) {
            if (m.group !== undefined) {
              warn(
                `${label} monologue "${m.id}" is grouped ("${m.group}") — official: one topic, no choice`,
              );
            }
            if (m.prepSec !== mono.prepSec) {
              warn(`${label} monologue "${m.id}" prepSec ${m.prepSec} — official ${mono.prepSec}`);
            }
            if (m.answerSec !== mono.answerSec) {
              warn(
                `${label} monologue "${m.id}" answerSec ${m.answerSec} — official ${mono.answerSec}`,
              );
            }
          }
        }
        break;
      }
    }
  }
  return out;
}

/**
 * The `ukr-state` branch of invariant 10 (UT16): the mock's subtests must be the
 * level's sections in order, with the §2 task counts, points, minutes, plays,
 * navigation, part times, word limits and speaking-task phrase counts.
 */
function ukrStateShapeIssues(exam: Exam): string[] {
  const shape = UKR_STATE_SHAPES[exam.level];
  const out: string[] = [];
  const warn = (msg: string) => out.push(`⚠ official-shape: ${msg}`);
  const want = shape.sections.map((s) => s.kind);
  const kinds = exam.subtests.map((s) => s.kind);
  if (kinds.join(',') !== want.join(',')) {
    warn(`subtests are [${kinds.join(', ')}] — the official order is [${want.join(', ')}]`);
  }
  for (const subtest of exam.subtests) {
    const sec = shape.sections.find((s) => s.kind === subtest.kind);
    if (!sec) continue;
    const label = `${subtest.kind} "${subtest.id}"`;
    const tasks = subtest.parts.reduce(
      (n, p) => n + p.items.reduce((m, i) => m + examItemTasks(i), 0),
      0,
    );
    const check = (what: string, got: unknown, wantVal: unknown) => {
      if (got !== wantVal) warn(`${label} ${what} ${String(got)} — official ${String(wantVal)}`);
    };
    const objective = OBJECTIVE_SUBTEST_KINDS.includes(subtest.kind);
    if (objective) check('has items', tasks, sec.items);
    check('maxPoints', subtest.maxPoints, sec.maxPoints);
    check('durationMin', subtest.durationMin, sec.durationMin);
    check('dictionary', subtest.dictionary, sec.dictionary);
    check('navigation', subtest.navigation, sec.navigation);
    if (sec.audioPlays !== undefined) check('audioPlays', subtest.audioPlays, sec.audioPlays);
    if (sec.parts !== undefined) check('has parts', subtest.parts.length, sec.parts);
    if (sec.partTimes !== undefined && subtest.kind === 'speaking') {
      const times = subtest.parts.map((p) => p.timeSec ?? '—');
      if (times.join('/') !== sec.partTimes.join('/')) {
        warn(
          `${label} part times are ${times.join('/')} s — official ${sec.partTimes.join('/')} s`,
        );
      }
    }
    if (sec.partTimes !== undefined && subtest.kind === 'writing') {
      const times = subtest.parts.map((p) => p.timeSec ?? '—');
      if (times.join('/') !== sec.partTimes.join('/')) {
        warn(
          `${label} part times are ${times.join('/')} s — official ${sec.partTimes.join('/')} s`,
        );
      }
    }
    if (subtest.kind === 'writing' && sec.words) {
      sec.words.forEach((w, pi) => {
        const item = subtest.parts[pi]?.items[0];
        if (item?.kind !== 'writing') return;
        const range = (min?: number, max?: number) => `${min ?? '—'}–${max ?? '∞'}`;
        if (item.minWords !== w.min || item.maxWords !== (w as { max?: number }).max) {
          warn(
            `${label} part ${pi + 1} words ${range(item.minWords, item.maxWords)} — official ${range(w.min, (w as { max?: number }).max)}`,
          );
        }
      });
    }
    if (subtest.kind === 'speaking' && sec.speakingTasks) {
      const t = sec.speakingTasks;
      const photo = subtest.parts[0]?.items[0];
      if (photo?.kind !== 'speaking-monologue' || photo.image === undefined) {
        warn(`${label} task 1 (photo description) needs a speaking-monologue item with an image`);
      } else if (photo.minSentences !== t.photoPhrases) {
        warn(
          `${label} photo description minSentences ${photo.minSentences} — official ${t.photoPhrases} phrases`,
        );
      }
      const mono = subtest.parts[1]?.items[0];
      if (mono?.kind !== 'speaking-monologue') {
        warn(`${label} task 2 (monologue) needs a speaking-monologue item`);
      } else if (
        mono.minSentences !== t.monologuePhrases.min ||
        mono.maxSentences !== t.monologuePhrases.max
      ) {
        warn(
          `${label} monologue phrases ${mono.minSentences}–${mono.maxSentences} — official ${t.monologuePhrases.min}–${t.monologuePhrases.max}`,
        );
      }
      const replies = subtest.parts[2]?.items.length ?? 0;
      if (replies !== t.dialogueReplies) {
        warn(`${label} dialogue has ${replies} replies — official ${t.dialogueReplies}`);
      }
    }
  }
  return out;
}
