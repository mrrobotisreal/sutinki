import { z } from 'zod';

import { CefrLevelSchema, LocalizedTextSchema, StableIdSchema } from './common';

/**
 * Reference data (T38, V2 §7.7): lemma lists that content and progress are
 * measured AGAINST — today the core A1/A2 vocabulary behind the dashboard's
 * coverage meter. A `reference` pack carries no stories; its lists ride the
 * normal sync/import machinery and are versioned like any pack (the list can
 * improve in later pack versions — it is never gold-plated in v1).
 *
 * The app joins a list against the user's lemmas on the `normalizeUk` fold
 * (NFC + lowercase + apostrophe -> U+02BC + ґ->г; ADR-0004), so a core «ґанок»
 * matches a banked «ганок» and «п'ять» matches «пʼять». Lemmas are authored in
 * their canonical spelling (ґ and the apostrophe kept).
 */

/**
 * Ukrainian dictionary form, optionally hyphenated («десь-небудь») and with an
 * inner apostrophe («п'ять»); lowercase. No Russian-only letters.
 */
const LEMMA_RE = /^[а-щьюяєіїґ]+(?:['ʼ’-][а-щьюяєіїґ]+)*$/;

export const ReferenceLemmaSchema = z.strictObject({
  /** Dictionary form exactly as the content annotates lemmas (NFC, ґ and apostrophe kept). */
  lemma: z
    .string()
    .regex(
      LEMMA_RE,
      'a reference lemma is lowercase Ukrainian (optional hyphen or inner apostrophe; Russian-only letters rejected)',
    )
    .refine((s) => s === s.normalize('NFC'), 'lemma must be UTF-8 NFC-normalized'),
  /** Token POS vocabulary (noun, verb, adj, adv, pron, prep, conj, part, num, pred, interj). */
  pos: z.string().min(1).optional(),
  /** Short English gloss, shown on the gap list. */
  translation: z.string().min(1).optional(),
});
export type ReferenceLemma = z.infer<typeof ReferenceLemmaSchema>;

/**
 * Pure mirror of the app's `normalizeUk` (apps/mobile/src/db/normalize.ts):
 * NFC + lowercase + every apostrophe variant -> U+02BC + ґ->г. A parity test
 * pins the two on a shared table.
 */
export function normalizeLemmaUk(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/['’ʼ`´]/g, 'ʼ')
    .replaceAll('ґ', 'г');
}

/** Folded match key (same as `normalizeLemmaUk`). */
export function referenceLemmaKey(lemma: string): string {
  return normalizeLemmaUk(lemma);
}

export const LemmaListSchema = z
  .strictObject({
    /** Stable list id, e.g. "core-a1". Unique within the pack. */
    id: StableIdSchema,
    /** The CEFR level this list measures. */
    level: CefrLevelSchema,
    title: LocalizedTextSchema,
    lemmas: z.array(ReferenceLemmaSchema).min(1),
  })
  .superRefine((list, ctx) => {
    // One row per folded lemma + POS — the coverage join counts lemmas, so a
    // duplicate would double-count.
    const seen = new Set<string>();
    list.lemmas.forEach((entry, i) => {
      const key = `${referenceLemmaKey(entry.lemma)}|${entry.pos ?? ''}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['lemmas', i, 'lemma'],
          message: `duplicate lemma "${entry.lemma}"${entry.pos ? ` (${entry.pos})` : ''} in list "${list.id}"`,
        });
      }
      seen.add(key);
    });
  });
export type LemmaList = z.infer<typeof LemmaListSchema>;
