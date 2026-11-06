/**
 * The gate mock + mocks-hidden-from-practice rules (UT17 Decisions 8–10) — PURE.
 *
 * `EXAM_GATE_TAG = 'ukr-exam:gate'`: a pack carrying it (UCT061 tags
 * `a1-ukrexam-mock-004` with `['ukr-exam','ukr-exam:mock','ukr-exam:gate']`,
 * UT18's hotel consumes this constant) is HIDDEN from every exam list until
 * the learner has attempted it once (≥ 1 `exam_attempts` row for that pack,
 * any state); afterwards it is an ordinary mock.
 *
 * Practice lists (drills, deck sources, speaking tiles, «Білети», «Мої
 * відповіді» suggestions, writing practice) take `mode: 'drill'` exams only; a
 * `mode: 'mock'` exam's items appear there only after that mock has a
 * FINISHED attempt, and never for a gate-tagged pack (ISS-003 lesson).
 */

export const EXAM_GATE_TAG = 'ukr-exam:gate';

/** Tag-bearing slice of a pack / exam summary. */
export interface GateTagged {
  packId: string;
  packTags?: readonly string[] | null;
}

export function isGateTagged(tags: readonly string[] | null | undefined): boolean {
  return (tags ?? []).includes(EXAM_GATE_TAG);
}

/** Hidden = gate-tagged AND not yet attempted. `attemptedPackIds` = packs with ≥ 1 attempt row. */
export function isHiddenGate(
  pack: GateTagged,
  attemptedPackIds: ReadonlySet<string> | readonly string[],
): boolean {
  if (!isGateTagged(pack.packTags)) return false;
  const set = attemptedPackIds instanceof Set ? attemptedPackIds : new Set(attemptedPackIds);
  return !set.has(pack.packId);
}

/** Hub / Library / texts lists: drop hidden gate packs. */
export function visibleExams<T extends GateTagged>(
  summaries: readonly T[],
  attemptedPackIds: ReadonlySet<string> | readonly string[],
): T[] {
  return summaries.filter((s) => !isHiddenGate(s, attemptedPackIds));
}

/**
 * The exams whose ITEMS may surface in practice entry points: drills always;
 * a mock only with a finished attempt on that exact exam and never when gate-tagged.
 * `finishedMockKeys` = `${packId}/${examId}` of finished mock attempts.
 */
export function practiceExams<T extends GateTagged & { examId: string; mode: 'mock' | 'drill' }>(
  summaries: readonly T[],
  finishedMockKeys: ReadonlySet<string>,
): T[] {
  return summaries.filter((s) => {
    if (s.mode === 'drill') return !isGateTagged(s.packTags);
    if (isGateTagged(s.packTags)) return false;
    return finishedMockKeys.has(`${s.packId}/${s.examId}`);
  });
}

/**
 * Borrowed-example protection (Decision 10a): the gate pack must never feed
 * learning evidence, grammar examples or listening-lab segments (UT19 calls this).
 * Any `ukr-exam:mock` pack is reserved too — mocks are unseen assessments.
 */
export function isReservedAssessment(
  packId: string,
  tags: readonly string[] | null | undefined,
): boolean {
  void packId;
  return isGateTagged(tags) || (tags ?? []).includes('ukr-exam:mock');
}

/** A gate or mock passage shows no word-popup / «bank all words» banner before the attempt finishes (Decision 10d). */
export function bankBannerAllowed(
  mode: 'mock' | 'drill',
  attemptStatus: 'active' | 'finished' | 'abandoned' | null,
): boolean {
  return mode === 'drill' || attemptStatus === 'finished';
}

/** Explanations of a gate mock are never shown before submission (Decision 10b). */
export function explanationsVisible(
  tags: readonly string[] | null | undefined,
  submitted: boolean,
): boolean {
  return !isGateTagged(tags) || submitted;
}

/** Re-attempting a gate mock after a pass is allowed but flagged in analytics `retake: true` (Decision 10c). */
export function isRetake(finishedAttemptsOfPack: number): boolean {
  return finishedAttemptsOfPack > 0;
}
