import { afterEach, describe, expect, it } from 'vitest';

import { UK_PENDING, ukPending } from '../flags';

/**
 * Pins the `uk-pending` key list to the ledger (docs/SUTINKI_UPSTREAM.md §5): a forgotten key
 * (or a key a follow-up UT forgot to delete) fails CI. Update both together.
 */
const LEDGER_KEYS = ['wordProfiles'];

const g = globalThis as { __DEV__?: boolean };
const original = g.__DEV__;
afterEach(() => {
  g.__DEV__ = original;
});

describe('uk-pending flags', () => {
  it('key list equals the ledger (UP02: wordProfiles, owner UT13)', () => {
    expect(Object.keys(UK_PENDING).sort()).toEqual([...LEDGER_KEYS].sort());
  });

  it('wordProfiles is on', () => {
    expect(UK_PENDING.wordProfiles).toBe(true);
  });

  it('hides in release builds, shows in the dev client', () => {
    g.__DEV__ = false;
    expect(ukPending('wordProfiles')).toBe(true);
    g.__DEV__ = true;
    expect(ukPending('wordProfiles')).toBe(false);
  });
});
