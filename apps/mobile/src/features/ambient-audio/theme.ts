import type { AmbientThemeId } from './beds';

/**
 * Which study soundtrack a classified pack gets (design AMBIENT_SOUNDTRACKS
 * §3.2). Pure function of the M14 classification (`classifyPack(pack)`):
 * category decides first (`ukr-exam-*` shares the education beds), genre only
 * matters under `stories`, and everything
 * else — other genres, podcast/documentary/travel, dialogues, games,
 * unclassified imports — takes the horror default.
 */
export function resolveAmbientTheme(c: {
  category: string;
  genre: string | null | undefined;
}): AmbientThemeId {
  if (c.category === 'news') return 'news';
  if (c.category === 'education') return 'education';
  // UT16b: every «Іспит» shelf (`ukr-exam-a1…c1`) studies to the education beds.
  if (c.category?.startsWith('ukr-exam-')) return 'education';
  if (c.category === 'stories' && c.genre === 'comedy') return 'comedy';
  if (c.category === 'stories' && c.genre === 'action') return 'action';
  return 'horror';
}
