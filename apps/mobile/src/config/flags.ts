/**
 * `uk-pending` feature flags (docs/SUTINKI_UPSTREAM.md §3). A `true` entry hides the
 * feature's entry points in RELEASE builds only (the dev client still shows them so the
 * follow-up ticket can develop against them). The UT that finishes the feature deletes
 * the key. Hidden code must still compile, typecheck and keep its tests green.
 */
// `wordProfiles` went with UT13b, `scenarios` with UT14, `exam` with UT17b («Іспит» is live).
// `hotel` (UP08): the M25 hotel path engine arrives with Sumrak's TORFL ladder; the Path tab shows a
// placeholder until UT18 («Готель «Сутінки»») re-targets it to the Ukrainian state exam and deletes the key.
export const UK_PENDING = { hotel: true } satisfies Record<string, boolean>;

export function ukPending(key: keyof typeof UK_PENDING): boolean {
  return UK_PENDING[key] && !(typeof __DEV__ !== 'undefined' && __DEV__);
}
