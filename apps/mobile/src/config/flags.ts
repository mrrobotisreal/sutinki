/**
 * `uk-pending` feature flags (docs/SUTINKI_UPSTREAM.md §3). A `true` entry hides the
 * feature's entry points in RELEASE builds only (the dev client still shows them so the
 * follow-up ticket can develop against them). The UT that finishes the feature deletes
 * the key. Hidden code must still compile, typecheck and keep its tests green.
 */
export const UK_PENDING = { scenarios: true } satisfies Record<string, boolean>;

export function ukPending(key: keyof typeof UK_PENDING): boolean {
  return UK_PENDING[key] && !(typeof __DEV__ !== 'undefined' && __DEV__);
}
