import { pluralUk } from '@/lib/uk-plural';

/** Seconds → «8 хвилин» / «2 хвилини» / «1 хвилина» (monologue copy reads the item's own prep / answer window). */
export function minutesUk(sec: number): string {
  const n = Math.round(sec / 60);
  return `${n} ${pluralUk(n, ['хвилина', 'хвилини', 'хвилин'])}`;
}
