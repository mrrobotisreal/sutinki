import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { UK_PENDING } from '../flags';

/**
 * UP08 hide-list pin: every hotel entry point stays behind `ukPending('hotel')` until UT18 re-targets the
 * hotel to «Готель «Сутінки»». Source-level on purpose (React Native screens); the release-build walk is the
 * behavioural proof.
 */
const SRC = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');
function walk(dir: string): string[] {
  return fs.readdirSync(path.join(SRC, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    return e.isDirectory() ? walk(rel) : [rel];
  });
}

describe('UK_PENDING.hotel hide-list', () => {
  it('the flag is on', () => {
    expect(UK_PENDING.hotel).toBe(true);
  });

  it('the Path tab renders the placeholder, not the hotel, while pending', () => {
    const tab = read('app/(tabs)/path.tsx');
    expect(tab).toMatch(/ukPending\('hotel'\) \? <PathPlaceholderScreen \/> : <HotelScreen \/>/);
  });

  it('the placeholder is Ukrainian and static', () => {
    const src = read('features/hotel/path-placeholder-screen.tsx');
    expect(src).toContain('Готель «Сутінки» відкриється згодом.');
    expect(src).toContain('Шлях');
  });

  it('every app/hotel route redirects to Сьогодні while pending', () => {
    const routes = walk('app/hotel').filter((f) => f.endsWith('.tsx'));
    expect(routes.length).toBe(5);
    for (const r of routes) {
      expect(read(r), r).toMatch(/ukPending\('hotel'\) \? <Redirect href="\/" \/>/);
    }
  });

  it('the Today hotel card is not rendered while pending', () => {
    expect(read('features/today/today-screen.tsx')).toMatch(
      /!ukPending\('hotel'\) && hotel\.action && <HotelContinueCard/,
    );
  });
});
