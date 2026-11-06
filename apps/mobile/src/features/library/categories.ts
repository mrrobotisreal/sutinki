import type { Ionicons } from '@expo/vector-icons';
import type * as React from 'react';

import type { PackRow } from '@/db/repositories/content';
import { profileFor, UKR_PROFILES } from '@/features/torfl/level-profile';

/**
 * Library categories, fiction genres and narration registers (M14, T44 —
 * LIBRARY_CATEGORIES §2.4/§2.5). THE one source of truth for classification:
 * the Library filter (T45), reader badges/labels (T46), search/bookmark
 * badges (T46) and every analytics prop all call `classifyPack()` — nothing
 * re-derives. Pure module, sibling of family-groups.ts, unit-tested without
 * a DB. The APP owns the known sets (like `theme.scene`): unknown slugs are
 * kept as authored and render with the raw slug + a generic icon, so a new
 * category or genre never needs a schema bump.
 */

export type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface SlugLabel {
  uk: string;
  en: string;
  icon: IoniconName;
}

export type CategorySlug =
  | 'stories'
  | 'news'
  | 'education'
  | 'podcast'
  | 'documentary'
  | 'travel'
  | 'ukr-exam-a1'
  | 'ukr-exam-a2'
  | 'ukr-exam-b1'
  | 'ukr-exam-b2'
  | 'ukr-exam-c1';

/** The six always-visible chips (§3). */
export const BASE_CATEGORY_ORDER: readonly CategorySlug[] = [
  'stories',
  'news',
  'education',
  'podcast',
  'documentary',
  'travel',
];

/** The five «Іспит · A1…C1» shelves (UT16b): a chip shows only for levels with ≥ 1 installed pack. */
export const EXAM_CATEGORY_ORDER: readonly CategorySlug[] = [
  'ukr-exam-a1',
  'ukr-exam-a2',
  'ukr-exam-b1',
  'ukr-exam-b2',
  'ukr-exam-c1',
];

/** Chip order — the six base chips, then the exam shelves. */
export const CATEGORY_ORDER: readonly CategorySlug[] = [
  ...BASE_CATEGORY_ORDER,
  ...EXAM_CATEGORY_ORDER,
];

export const CATEGORIES: Record<CategorySlug, SlugLabel> = {
  stories: { uk: 'Історії', en: 'Stories', icon: 'book-outline' },
  news: { uk: 'Новини', en: 'News', icon: 'newspaper-outline' },
  education: { uk: 'Навчання', en: 'Education', icon: 'school-outline' },
  podcast: { uk: 'Подкасти', en: 'Podcasts', icon: 'mic-outline' },
  documentary: { uk: 'Документалки', en: 'Documentaries', icon: 'film-outline' },
  travel: { uk: 'Подорожі', en: 'Travel', icon: 'airplane-outline' },
  'ukr-exam-a1': { uk: UKR_PROFILES.A1.chipLabel, en: 'Exam · A1', icon: 'ribbon-outline' },
  'ukr-exam-a2': { uk: UKR_PROFILES.A2.chipLabel, en: 'Exam · A2', icon: 'ribbon-outline' },
  'ukr-exam-b1': { uk: UKR_PROFILES.B1.chipLabel, en: 'Exam · B1', icon: 'ribbon-outline' },
  'ukr-exam-b2': { uk: UKR_PROFILES.B2.chipLabel, en: 'Exam · B2', icon: 'ribbon-outline' },
  'ukr-exam-c1': { uk: UKR_PROFILES.C1.chipLabel, en: 'Exam · C1', icon: 'ribbon-outline' },
};

/** Genre chip order inside «Історії» (only installed genres are shown, §3). */
export const GENRE_ORDER = [
  'horror',
  'mystery',
  'scifi',
  'fantasy',
  'action',
  'comedy',
  'romance',
  'drama',
  'family',
  'slice-of-life',
  'absurd',
  'fairy-tale',
] as const;

export type GenreSlug = (typeof GENRE_ORDER)[number];

export const GENRES: Record<GenreSlug, SlugLabel> = {
  horror: { uk: 'Жахи', en: 'Horror', icon: 'skull-outline' },
  mystery: { uk: 'Детектив', en: 'Mystery', icon: 'search-outline' },
  scifi: { uk: 'Фантастика', en: 'Sci-fi', icon: 'planet-outline' },
  fantasy: { uk: 'Фентезі', en: 'Fantasy', icon: 'sparkles-outline' },
  action: { uk: 'Бойовик', en: 'Action', icon: 'flash-outline' },
  comedy: { uk: 'Комедія', en: 'Comedy', icon: 'happy-outline' },
  romance: { uk: 'Романтика', en: 'Romance', icon: 'heart-outline' },
  drama: { uk: 'Драма', en: 'Drama', icon: 'rainy-outline' },
  family: { uk: 'Родина', en: 'Family', icon: 'people-outline' },
  'slice-of-life': { uk: 'Побут', en: 'Slice of life', icon: 'cafe-outline' },
  absurd: { uk: 'Абсурд', en: 'Absurd', icon: 'shuffle-outline' },
  'fairy-tale': { uk: 'Казки', en: 'Fairy tales', icon: 'leaf-outline' },
};

/** The «Усі» genre chip / the persisted "no genre filter" value. */
export const ALL_GENRES = 'all';

/**
 * Narration register → in-app label (§2.5). A register is a pipeline preset
 * carried in `AudioTrack.style`; T46's audio-bar label maps a known slug to
 * its Russian name («Mr. Wintrow · Диктор») and falls back to the raw style.
 */
export const REGISTER_LABELS: Record<string, string> = {
  narrator: 'Оповідач',
  anchor: 'Диктор',
  lecturer: 'Лектор',
  host: 'Ведучий',
  voiceover: 'Закадровий голос',
  guide: 'Гід',
};

export interface Classified {
  /** Category slug — a known `CategorySlug` or a forward-compatible unknown one. */
  category: string;
  /** Genre slug, or null = genre-less (dialogues, non-fiction, unknown). */
  genre: string | null;
}

/**
 * THE default table (approved 2026-09-20, §2.4):
 *
 * | pack has…                              | category    | genre                 |
 * | explicit `category` / `genre`          | as authored | as authored (or null) |
 * | none; type `stories` or `course-unit`  | `stories`   | `horror`              |
 * | none; type `dialogue`                  | `stories`   | none                  |
 * | none; type `exam` (M18 T69, UT16b)     | `ukr-exam-<level>` (unknown level → A1) | none |
 *
 * `origin: 'local'` packs never go through the chip filter (always the
 * «Імпортовано» shelf) — they still classify as `stories/null` so badges
 * elsewhere have something to show. `origin` is part of the input contract
 * for that reason even though the table itself keys off it only via type.
 */
export function classifyPack(
  p: Pick<PackRow, 'type' | 'category' | 'genre' | 'origin'> & { level?: string | null },
): Classified {
  // '' can't come from a validated pack (StableId min 1) — only from a
  // hand-staged row; treat it like NULL so both fields agree on "absent".
  const genre = p.genre || null;
  if (p.category) return { category: p.category, genre };
  if (p.origin === 'local') return { category: 'stories', genre };
  if (p.type === 'dialogue') return { category: 'stories', genre }; // genre-less unless authored
  // UT16b: an exam pack only ever shelves under its level's «Іспит · A1…C1» shelf.
  if (p.type === 'exam') return { category: profileFor(p.level).category, genre };
  return { category: 'stories', genre: genre ?? 'horror' }; // stories, course-unit (and anything else)
}

/** Analytics props (M14 §4.5) — slugs only; genre-less = `'none'`. */
export interface ClassificationEventProps {
  category: string;
  genre: string;
}

/**
 * The `category` + `genre` props every reader/narration/dialogue event
 * carries (T46). One `classifyPack()` per screen mount feeds this; call
 * sites spread the result rather than re-classifying.
 */
export function classificationEventProps(c: Classified): ClassificationEventProps {
  return { category: c.category, genre: c.genre ?? 'none' };
}

export const categoryOf = (p: Parameters<typeof classifyPack>[0]): string =>
  classifyPack(p).category;
export const genreOf = (p: Parameters<typeof classifyPack>[0]): string | null =>
  classifyPack(p).genre;

export function isKnownCategory(slug: string): slug is CategorySlug {
  return Object.prototype.hasOwnProperty.call(CATEGORIES, slug);
}

export function isKnownGenre(slug: string): slug is GenreSlug {
  return Object.prototype.hasOwnProperty.call(GENRES, slug);
}

/** Known → table entry; unknown → the raw slug with a generic shelf icon. */
export function labelForCategory(slug: string): SlugLabel {
  return isKnownCategory(slug) ? CATEGORIES[slug] : { uk: slug, en: slug, icon: 'albums-outline' };
}

/** Known → table entry; unknown → the raw slug with a generic tag icon. */
export function labelForGenre(slug: string): SlugLabel {
  return isKnownGenre(slug) ? GENRES[slug] : { uk: slug, en: slug, icon: 'pricetag-outline' };
}
