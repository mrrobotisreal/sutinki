/**
 * `uk-pending` feature flags (docs/SUTINKI_UPSTREAM.md §3). A `true` entry hides the
 * feature's entry points in RELEASE builds only (the dev client still shows them so the
 * follow-up ticket can develop against them). The UT that finishes the feature deletes
 * the key. Hidden code must still compile, typecheck and keep its tests green.
 */
// `wordProfiles` went with UT13b, `scenarios` with UT14. `exam` (the Russian TORFL A1 engine, UP04)
// stays hidden until UT16/UT17 re-target it to the Ukrainian state exam; UT17 deletes the key.
// Future pending features (hotel, practice pilots …) add their key here, owned by their UT.
// `hotel` (UP08): the M25 hotel path engine arrives with Sumrak's TORFL ladder; the Path tab shows a
// placeholder until UT18 («Готель «Сутінки»») re-targets it to the Ukrainian state exam and deletes the key.
export const UK_PENDING = { exam: true, hotel: true } satisfies Record<string, boolean>;

export function ukPending(key: keyof typeof UK_PENDING): boolean {
  return UK_PENDING[key] && !(typeof __DEV__ !== 'undefined' && __DEV__);
}
