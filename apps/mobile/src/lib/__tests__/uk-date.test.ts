import { describe, expect, it } from 'vitest';

import { formatUkDate, formatUkDateFallback } from '@/features/library/library-filter';
import * as ukDate from '@/lib/uk-date';

// The full behaviour suite lives in features/library/__tests__/library-filter.test.ts
// (T45); this pins the T46 relocation — one implementation, two import paths.
describe('lib/uk-date (T46 relocation)', () => {
  it('library-filter re-exports the very same functions', () => {
    expect(formatUkDate).toBe(ukDate.formatUkDate);
    expect(formatUkDateFallback).toBe(ukDate.formatUkDateFallback);
  });

  it('renders the §4.3 caption date', () => {
    expect(ukDate.formatUkDate('2026-09-14')).toBe('14 вер. 2026');
  });

  it('Intl (Node full ICU) and the table agree for all 12 months', () => {
    expect(ukDate.detectUkDatePath()).toBe('intl');
    for (let m = 1; m <= 12; m++) {
      const iso = `2026-${String(m).padStart(2, '0')}-05`;
      expect(ukDate.formatUkDate(iso)).toBe(ukDate.formatUkDateFallback(iso));
    }
  });
});
