import { apostrophesIn, describeApostrophe, foldApostrophes } from './apostrophe.ts';
import type { DraftIssue } from './errors.ts';
import type { DraftSentence } from './draft.ts';

/**
 * Token alignment: walk the authored sentence text consuming each token row's
 * surface form in order, deriving per-token `spaceBefore` from the actual
 * spacing in the sentence. Because the derivation *is* the reconstruction
 * invariant (schema §4.2: tokens must rebuild `uk` exactly), a draft that
 * aligns here can never fail the schema's reconstruction check — and authors
 * never hand-maintain `spaceBefore`.
 */

export type AlignResult =
  { ok: true; spaceBefore: boolean[] } | { ok: false; issues: DraftIssue[] };

/** A short excerpt of the sentence around an offset, for error messages. */
function excerpt(uk: string, at: number): string {
  const from = Math.max(0, at - 10);
  const to = Math.min(uk.length, at + 15);
  const prefix = from > 0 ? '…' : '';
  const suffix = to < uk.length ? '…' : '';
  return `${prefix}${uk.slice(from, at)}⟨here⟩${uk.slice(at, to)}${suffix}`;
}

/**
 * Align a sentence's token rows against its UK: text. On success returns the
 * derived `spaceBefore` per token; on failure, precise line-level issues.
 */
export function alignSentence(file: string, sentence: DraftSentence): AlignResult {
  const { uk, rows } = sentence;
  const spaceBefore: boolean[] = [];
  let pos = 0;

  for (const row of rows) {
    let space = false;
    if (uk[pos] === ' ') {
      space = true;
      pos += 1;
      if (uk[pos] === ' ') {
        return {
          ok: false,
          issues: [
            {
              file,
              line: sentence.ukLine,
              message: `sentence "${sentence.id}" contains a double space at offset ${pos}: "${excerpt(uk, pos)}"`,
            },
          ],
        };
      }
    }
    if (!uk.startsWith(row.text, pos)) {
      // Same word, different apostrophe code point? Name the real cause.
      if (foldApostrophes(uk).startsWith(foldApostrophes(row.text), pos)) {
        const inSentence = apostrophesIn(uk.slice(pos, pos + row.text.length));
        const inToken = apostrophesIn(row.text);
        return {
          ok: false,
          issues: [
            {
              file,
              line: row.line,
              message:
                `apostrophe mismatch: token "${row.text}" uses ${inToken.map(describeApostrophe).join(', ')} ` +
                `but sentence "${sentence.id}" has ${inSentence.map(describeApostrophe).join(', ')} at offset ${pos}: ` +
                `"${excerpt(uk, pos)}" — the token text must use the sentence's apostrophe exactly (U+0027 is the convention)`,
            },
          ],
        };
      }
      return {
        ok: false,
        issues: [
          {
            file,
            line: row.line,
            message:
              `token "${row.text}" does not match sentence "${sentence.id}" at offset ${pos}: ` +
              `"${excerpt(uk, pos)}" — token surfaces must appear in order and rebuild the sentence exactly`,
          },
        ],
      };
    }
    pos += row.text.length;
    spaceBefore.push(space);
  }

  if (pos !== uk.length) {
    return {
      ok: false,
      issues: [
        {
          file,
          line: rows[rows.length - 1]?.line ?? sentence.ukLine,
          message:
            `token table for sentence "${sentence.id}" ends before the sentence does — ` +
            `unconsumed text: "${excerpt(uk, pos)}"`,
        },
      ],
    };
  }

  return { ok: true, spaceBefore };
}
