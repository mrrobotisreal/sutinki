import { UKR_STATE_SHAPES, type ExamSubtestKind, type UkrStateSection } from '@sutinki/schema';

import type { ExamVerdict } from './model';
import type { ExamLevel } from './level-profile';

/**
 * The state-exam verdict (UT17, ADR-0011 amended) — PURE, data-driven.
 *
 * RULE OF RECORD (docs/design/UKR_EXAM_PREP.md §2, «Rule for every level below:
 * pass = total ≥ 70 %»; four parts × 25 % [exam-doc p1] [reg20 IV.4–5] [roz §5];
 * B2/C1 = the officials' band floors 60 / 70 with weights 40/30/30 [reg20 IV.6–12]):
 *
 *   total = Σ (section % × weightPct) ÷ Σ weightPct          (weights from the level shape)
 *   pass  ⇔ total ≥ shape.pass.totalPct                       (70 at A1/A2/B1)
 *   NO per-section floor — §2 §8-Q5 found none for citizenship. If the
 *   Commission adds one, set `shape.pass.perSectionMinPct`: this file then
 *   names the sections under it in `retake` and fails the attempt (only data
 *   changes, not code).
 *
 * ROUNDING (§2 states none → the STRICTER reading, Open question for Mitch):
 * the total is compared UNROUNDED (a 69.96 % total does not pass); section
 * percentages arrive already rounded to one decimal by `roundPct` (scoring).
 * The total is displayed floored to one decimal so a failing 69.96 never reads
 * as «70,0 %».
 *
 * `null` verdict = PENDING (some section of the level has no score yet).
 * `ExamVerdict` is `'pass' | 'fail'` — the SPbU `'pass-borderline'` is gone.
 */

export type VerdictPcts = Partial<Record<ExamSubtestKind, number | null>>;

export interface SectionMargin {
  kind: ExamSubtestKind;
  pct: number;
  weightPct: number;
  /** pct − the level threshold (the «запас» of this one section against the total rule; informational). */
  vsThreshold: number;
}

export interface VerdictOutcome {
  verdict: ExamVerdict;
  /** Weighted total, unrounded. */
  total: number;
  /** total − threshold (≥ 0 = pass); display with {@link marginLabel}. */
  margin: number;
  /** Sections under `perSectionMinPct` (always [] while the level has none). */
  retake: ExamSubtestKind[];
}

/** The level's rule as data (shape → numbers). */
export function ruleOf(level: ExamLevel): {
  sections: readonly UkrStateSection[];
  passPct: number;
  perSectionMinPct: number | null;
} {
  const shape = UKR_STATE_SHAPES[level];
  return {
    sections: shape.sections,
    passPct: shape.pass.totalPct,
    perSectionMinPct: shape.pass.perSectionMinPct ?? null,
  };
}

const EPS = 1e-9;

/** Weighted total of the scored sections (missing ones count as absent — callers check `missing` first). */
export function weightedTotal(pcts: VerdictPcts, level: ExamLevel): number {
  const { sections } = ruleOf(level);
  let sum = 0;
  let w = 0;
  for (const s of sections) {
    sum += (pcts[s.kind] ?? 0) * s.weightPct;
    w += s.weightPct;
  }
  return w > 0 ? sum / w : 0;
}

/** Total in one decimal, FLOORED (never displays a pass the rule does not give). */
export function floorTenth(value: number): number {
  return Math.floor(value * 10 + EPS) / 10;
}

/**
 * Pure rule over the level's sections; a missing / null pct counts as a FAIL
 * (the readiness estimate: «unknown» can never predict a pass).
 */
export function predictVerdict(pcts: VerdictPcts, level: ExamLevel = 'A1'): VerdictOutcome {
  const { sections, passPct, perSectionMinPct } = ruleOf(level);
  const total = weightedTotal(pcts, level);
  const anyMissing = sections.some((s) => pcts[s.kind] === null || pcts[s.kind] === undefined);
  const retake =
    perSectionMinPct === null
      ? []
      : sections
          .filter((s) => (pcts[s.kind] ?? 0) < perSectionMinPct - EPS)
          .map((s) => s.kind);
  const pass = !anyMissing && total + EPS >= passPct && retake.length === 0;
  return { verdict: pass ? 'pass' : 'fail', total, margin: total - passPct, retake };
}

export interface FullVerdict {
  /** null while any section of the level has no score (PENDING — the card names the missing ones). */
  verdict: ExamVerdict | null;
  /** Weighted total of the scored sections (unrounded); meaningful only when `verdict !== null`. */
  total: number;
  /** total − threshold; 0 while pending. */
  margin: number;
  passPct: number;
  retake: ExamSubtestKind[];
  /** Per-section pct and weight, in the level's section order (scored ones only). */
  sections: SectionMargin[];
  /** True when a writing / speaking pct behind the verdict is still the offline guess. */
  provisional: boolean;
  /** Sections of the level with no score yet, in section order. */
  missing: ExamSubtestKind[];
}

/**
 * The results card's verdict: `verdict: null` when any section of `level` is
 * missing (skipped placeholders, a single-section scope). `provisional` is
 * OR-ed over the sections flagged in `provisionalKinds`.
 */
export function verdict(
  pcts: VerdictPcts,
  provisionalKinds: Partial<Record<ExamSubtestKind, boolean>> = {},
  level: ExamLevel = 'A1',
): FullVerdict {
  const { sections, passPct } = ruleOf(level);
  const missing = sections
    .filter((s) => pcts[s.kind] === null || pcts[s.kind] === undefined)
    .map((s) => s.kind);
  const scored: SectionMargin[] = sections
    .filter((s) => !missing.includes(s.kind))
    .map((s) => ({
      kind: s.kind,
      pct: pcts[s.kind]!,
      weightPct: s.weightPct,
      vsThreshold: pcts[s.kind]! - passPct,
    }));
  const provisional = sections.some((s) => provisionalKinds[s.kind] === true);
  if (missing.length > 0) {
    return {
      verdict: null,
      total: 0,
      margin: 0,
      passPct,
      retake: [],
      sections: scored,
      provisional: false,
      missing,
    };
  }
  const o = predictVerdict(pcts, level);
  return {
    verdict: o.verdict,
    total: o.total,
    margin: o.margin,
    passPct,
    retake: o.retake,
    sections: scored,
    provisional,
    missing: [],
  };
}

/** «Склав» / «Не склав» (the card headline; the state exam grants a certificate, but a mock only models it). */
export function verdictHeadline(v: ExamVerdict): string {
  return v === 'pass' ? 'Склав би' : 'Не склав би';
}

/** «запас 4,2 п. п.» / «бракує 1,3 п. п.» — the margin against the threshold, floored to a tenth towards zero. */
export function marginLabel(margin: number): string {
  const abs = Math.floor(Math.abs(margin) * 10 + EPS) / 10;
  const text = abs.toLocaleString('uk-UA', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (margin >= -EPS) return `запас ${text} п. п.`;
  // a failing total shows the shortfall rounded UP so «бракує 0,0» never appears
  const up = Math.ceil(Math.abs(margin) * 10 - EPS) / 10;
  return `бракує ${up.toLocaleString('uk-UA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} п. п.`;
}

