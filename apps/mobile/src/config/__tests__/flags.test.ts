import { afterEach, describe, expect, it } from 'vitest';

import { UK_PENDING, ukPending } from '../flags';

/**
 * Pins the `uk-pending` key list to the ledger (docs/SUTINKI_UPSTREAM.md §5): a forgotten key
 * (or a key a follow-up UT forgot to delete) fails CI. Update both together.
 */
const LEDGER_KEYS: string[] = ['hotel'];

const g = globalThis as { __DEV__?: boolean };
const original = g.__DEV__;
afterEach(() => {
  g.__DEV__ = original;
});

describe('uk-pending flags', () => {
  it('key list equals the ledger (hotel pending UT18; wordProfiles deleted by UT13b, scenarios by UT14, exam by UT17b)', () => {
    expect(Object.keys(UK_PENDING).sort()).toEqual([...LEDGER_KEYS].sort());
  });

  it('wordProfiles flag is gone (UT13b)', () => {
    expect('wordProfiles' in UK_PENDING).toBe(false);
  });

  it('scenarios flag is gone (UT14)', () => {
    expect('scenarios' in UK_PENDING).toBe(false);
  });

  it('exam flag is gone (UT17b)', () => {
    expect('exam' in UK_PENDING).toBe(false);
  });

  it('hotel hides in release and shows in the dev client', () => {
    g.__DEV__ = false;
    expect(ukPending('hotel')).toBe(true);
    g.__DEV__ = true;
    expect(ukPending('hotel')).toBe(false);
  });
});
