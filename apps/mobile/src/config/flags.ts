/**
 * `uk-pending` feature flags (docs/SUTINKI_UPSTREAM.md §3). A `true` entry hides the
 * feature's entry points in RELEASE builds only (the dev client still shows them so the
 * follow-up ticket can develop against them). The UT that finishes the feature deletes
 * the key. Hidden code must still compile, typecheck and keep its tests green.
 */
// Empty since UT14 (scenarios live): `wordProfiles` went with UT13b, `scenarios` with UT14. Future
// pending features (exam, hotel, practice pilots …) add their key here, owned by their UT.
export const UK_PENDING = {} satisfies Record<string, boolean>;

export function ukPending(key: keyof typeof UK_PENDING): boolean {
  return UK_PENDING[key] && !(typeof __DEV__ !== 'undefined' && __DEV__);
}
