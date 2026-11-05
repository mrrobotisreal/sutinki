import { foldForAnswer } from '@/lib/text';

import type { ProfileCell, ProfileLanguage, WordProfile } from '../../../word-forms/profile-schema';

/**
 * Case-ending cloze: pure stem/ending split and eligibility.
 *
 * Sutinki-first (UT20); candidate for upstream Sumrak T37 — Russian grids are
 * `CASES.ru` 6 rows, the code is language-parameterised (`language: 'ru'|'uk'`,
 * the Voc. row only exists for `uk`). No React, no DB, no network.
 *
 * The stem is the longest common prefix of EVERY plain form in the declension
 * grid (cells split on " / ", nulls skipped), minimum 2 letters; whatever
 * follows it in the sentence's surface form is the ending the learner types.
 * Consonant alternations (рука → руці) therefore land INSIDE the ending, and
 * the hint says so («чергування»). Alternations are never modelled rule by rule.
 */

export const MIN_STEM_LETTERS = 2;

/** English case slugs by row index — identical for ru (6 rows, Prep. = loc) and uk (7 rows). */
export const CASE_SLUGS = ['nom', 'gen', 'dat', 'acc', 'instr', 'loc', 'voc'] as const;
export type CaseSlug = (typeof CASE_SLUGS)[number];

export type EndingPos = 'noun' | 'adj' | 'pron' | 'name';

const GRID_SECTIONS: Record<string, EndingPos> = {
  'noun-declension': 'noun',
  'adj-long': 'adj',
  'pron-declension': 'pron',
  'name-declension': 'name',
};

/** Row index of the vocative in the 7-row Ukrainian case grid. */
const VOC_ROW = 6;

/** Tolerant comparison key (stress, case, apostrophe, ґ for uk; stress, case, ё for ru). */
function fold(language: ProfileLanguage, text: string): string {
  if (language === 'ru') {
    return text
      .normalize('NFC')
      .replace(/[̀́]/g, '')
      .toLowerCase()
      .replaceAll('ё', 'е') // intentional: Russian input
      .replace(/\s+/g, ' ')
      .trim();
  }
  return foldForAnswer(text);
}

/** A grid cell's alternative forms (cell split on " / "), plain (no stress), authored spelling. */
export function cellForms(cell: ProfileCell): string[] {
  if (!cell) return [];
  return cell.plain
    .normalize('NFC')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Length of the longest common prefix of the folded forms (0 for an empty list). */
export function lcpLength(language: ProfileLanguage, forms: string[]): number {
  if (forms.length === 0) return 0;
  const folded = forms.map((f) => fold(language, f));
  let n = folded[0]!.length;
  for (const f of folded) {
    let i = 0;
    while (i < n && i < f.length && f[i] === folded[0]![i]) i++;
    n = i;
  }
  return n;
}

/**
 * `stemSplit(forms)` → the shared stem and each form's ending, or null when
 * the shared prefix is shorter than {@link MIN_STEM_LETTERS} (suppletive /
 * fleeting-vowel paradigms: whole-word cloze instead) or the forms are all
 * identical (indeclinable: nothing to drill).
 */
export function stemSplit(
  forms: string[],
  language: ProfileLanguage = 'uk',
): { stem: string; endings: string[] } | null {
  const n = lcpLength(language, forms);
  if (n < MIN_STEM_LETTERS) return null;
  const endings = forms.map((f) => f.normalize('NFC').slice(n));
  if (endings.every((e) => e === '')) return null;
  return { stem: forms[0]!.normalize('NFC').slice(0, n), endings };
}

/**
 * The ending of `surface` after `stem` (stress/case/apostrophe/ґ-tolerant,
 * ё/е for ru), in the surface's own spelling; null when the surface doesn't
 * start with the stem.
 */
export function endingFor(
  surface: string,
  stem: string,
  language: ProfileLanguage = 'uk',
): string | null {
  const plain = surface.normalize('NFC').replace(/[̀́]/g, '');
  if (!fold(language, plain).startsWith(fold(language, stem))) return null;
  return plain.slice(stem.length);
}

// --- case from the token's grammar note --------------------------------------

/** `m.sg. acc. (animate = gen.)` → 'acc'. First case abbreviation outside parentheses. */
export function caseFromGrammar(grammar: string | null | undefined): CaseSlug | null {
  if (!grammar) return null;
  const outside = grammar.replace(/\([^)]*\)/g, ' ');
  const m = /(?:^|[\s.,;/+])(nom|gen|dat|acc|instr|loc|voc)\./.exec(outside);
  return m ? (m[1] as CaseSlug) : null;
}

// --- alternation heuristic ---------------------------------------------------

const ALTERNATION_GROUPS = ['кцч', 'гзж', 'хсш', 'ґзж', 'цч', 'дж', 'тч', 'ся', 'ої', 'еі', 'єі'];

function alternates(a: string, b: string): boolean {
  if (!a || !b || a === b) return false;
  return ALTERNATION_GROUPS.some((g) => g.includes(a) && g.includes(b));
}

export interface EndingVariantSpec {
  /** The surface's stem as written in the sentence (keeps capitalisation and authored apostrophe). */
  stem: string;
  /** Accepted endings, the surface's own first. Never empty strings. */
  endings: string[];
  /** Blank width: the longest ending in the matched grid column(s). */
  blankLength: number;
  caseIndex: number;
  caseSlug: CaseSlug;
  pos: EndingPos;
  language: ProfileLanguage;
  /** The ending swallows a consonant/vowel alternation (рука → руці): the hint adds «чергування». */
  alternation: boolean;
}

export interface EndingToken {
  text: string;
  /** UT02 grammar column, e.g. `f.sg. voc. (address)`. */
  grammar?: string | null;
}

/** Declension grid of a profile: its section, if any of the supported ids is a filled 2-D grid. */
function findGrid(profile: WordProfile) {
  for (const s of profile.sections) {
    const pos = GRID_SECTIONS[s.id];
    if (pos && s.layout === 'grid' && s.grid && s.grid.cells.length > 0) {
      return { pos, grid: s.grid };
    }
  }
  return null;
}

/**
 * Decide whether a sentence token can play the ending variant for a word
 * profile. Pure; every miss is a silent fallback to ordinary cloze (null).
 *
 * Rules: the profile has a declension grid; the token's surface (folded)
 * appears in a cell; the case is unambiguous (the grammar note's case, or
 * exactly one matching row); the grid-wide stem is >= 2 letters (otherwise
 * the matched column alone is tried — `дитина`/`діти`-class); the surface
 * has a non-empty ending. The Voc. row only counts when its cell differs
 * from Nom. in the same column (vocative = nominative -> no vocative item).
 */
export function endingVariantFor(
  token: EndingToken,
  profile: WordProfile,
  language: ProfileLanguage = profile.language,
): EndingVariantSpec | null {
  const found = findGrid(profile);
  if (!found) return null;
  const { pos, grid } = found;
  const surfaceKey = fold(language, token.text);
  if (!surfaceKey) return null;

  type Hit = { row: number; col: number };
  const hits: Hit[] = [];
  grid.cells.forEach((cells, row) => {
    cells.forEach((cell, col) => {
      const forms = cellForms(cell).map((f) => fold(language, f));
      if (!forms.includes(surfaceKey)) return;
      if (language === 'uk' && row === VOC_ROW) {
        const nom = (grid.cells[0]?.[col] ? cellForms(grid.cells[0][col]!) : []).map((f) =>
          fold(language, f),
        );
        if (forms.every((f) => nom.includes(f))) return; // vocative = nominative
      }
      hits.push({ row, col });
    });
  });
  if (hits.length === 0) return null;

  const wanted = caseFromGrammar(token.grammar);
  let rows = [...new Set(hits.map((h) => h.row))];
  if (wanted) {
    const idx = CASE_SLUGS.indexOf(wanted);
    if (!rows.includes(idx)) return null;
    rows = [idx];
  } else if (rows.length !== 1) {
    return null; // syncretic form, no grammar note: the case hint would mislead
  }
  const caseIndex = rows[0]!;
  const caseSlug = CASE_SLUGS[caseIndex];
  if (!caseSlug) return null;
  const matched = hits.filter((h) => h.row === caseIndex);

  // Stem: whole grid first; if too short, the matched column only.
  const allForms = grid.cells.flat().flatMap(cellForms);
  let scope: string[] = allForms;
  let n = lcpLength(language, scope);
  let columns: number[] = grid.cells[0] ? grid.cells[0].map((_, c) => c) : [];
  if (n < MIN_STEM_LETTERS) {
    const col = matched[0]!.col;
    scope = grid.cells.flatMap((r) => cellForms(r[col] ?? null));
    n = lcpLength(language, scope);
    columns = [col];
  }
  if (n < MIN_STEM_LETTERS) return null;

  const plainSurface = token.text.normalize('NFC').replace(/[̀́]/g, '');
  if (plainSurface.length <= n) return null;
  const stem = plainSurface.slice(0, n);
  const own = plainSurface.slice(n);

  // Accepted endings: the surface's own, then the other forms of the matched cells.
  const endings = [own];
  const seen = new Set([fold(language, own)]);
  for (const h of matched) {
    for (const form of cellForms(grid.cells[h.row]?.[h.col] ?? null)) {
      const e = form.slice(n);
      const k = fold(language, e);
      if (!e || seen.has(k)) continue;
      seen.add(k);
      endings.push(e);
    }
  }

  const columnForms = columns.flatMap((c) => grid.cells.flatMap((r) => cellForms(r[c] ?? null)));
  const blankLength = Math.max(own.length, ...columnForms.map((f) => f.length - n));

  // «чергування»: the first letter of the ending differs from the nominative's, as an alternation pair.
  const nomForm = cellForms(grid.cells[0]?.[matched[0]!.col] ?? null)[0];
  const alternation =
    language === 'uk' &&
    !!nomForm &&
    alternates(
      fold(language, nomForm).charAt(n) || '',
      fold(language, plainSurface).charAt(n) || '',
    );

  return { stem, endings, blankLength, caseIndex, caseSlug, pos, language, alternation };
}

/** Typed answer check: the ending (or the whole word) in any accepted ending; no tolerance for wrong letters. */
export function endingMatches(
  spec: Pick<EndingVariantSpec, 'stem' | 'endings'>,
  typed: string,
  language: ProfileLanguage = 'uk',
): boolean {
  const t = fold(language, typed);
  if (!t) return false;
  const stemKey = fold(language, spec.stem);
  return spec.endings.some((e) => {
    const ek = fold(language, e);
    return t === ek || t === stemKey + ek;
  });
}
