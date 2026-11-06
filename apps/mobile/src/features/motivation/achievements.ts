import type { Ionicons } from '@expo/vector-icons';

import { STABILITY_MATURE_MIN } from '@/lib/mastery';

/**
 * The achievement set (T19, §7.7 named minimum + a few natural milestones
 * already implied by shipped features). Ids are stable strings persisted in
 * the `achievements` table — never rename one that may have unlocked.
 * Unlock checks are evented off existing write paths (ticket requirement),
 * see service.ts; `stats.unlockAchievement` is idempotent so a re-fired
 * check can never double-unlock or re-toast.
 */
export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Toast header line; default «Achievement unlocked» (T34's quest toast passes «Quest complete»). */
  kicker?: string;
}

/** UT16b: the four level-scoped «Іспит» achievements of each level (hidden while `UK_PENDING.exam`). */
const EXAM_LEVEL_ACHIEVEMENTS: AchievementDef[] = (['A1', 'A2', 'B1', 'B2', 'C1'] as const).flatMap(
  (level) => {
    const l = level.toLowerCase();
    return [
      {
        id: `exam-${l}-first-mock`,
        title: `Перший пробний іспит ${level}`,
        description: `Finish your first ${level} state-exam mock`,
        icon: 'document-text-outline' as const,
      },
      {
        id: `exam-${l}-would-pass`,
        title: `${level}: склав би!`,
        description: `A full ${level} mock whose verdict is a pass`,
        icon: 'ribbon-outline' as const,
      },
      {
        id: `exam-${l}-margin`,
        title: `${level}: із запасом`,
        description: `Every ${level} section at 80 % or better in one mock`,
        icon: 'trophy-outline' as const,
      },
      {
        id: `exam-${l}-deck-100`,
        title: `${level}: робота над помилками`,
        description: `Bring 100 ${level} exam-deck items to the FSRS Review state`,
        icon: 'ribbon-outline' as const,
      },
    ];
  },
);

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-word',
    title: 'Перше слово',
    description: 'Add your first word to the word bank',
    icon: 'bookmark-outline',
  },
  {
    id: 'first-story',
    title: 'Перша історія',
    description: 'Finish reading your first story',
    icon: 'book-outline',
  },
  {
    id: 'first-journal',
    title: 'Любий щоденнику',
    description: 'Write your first journal entry',
    icon: 'create-outline',
  },
  {
    id: 'bank-100',
    title: 'Колекціонер',
    description: 'Grow the word bank to 100 items',
    icon: 'library-outline',
  },
  {
    id: 'mastered-100',
    title: 'Сто слів у темряві',
    description: 'Master 100 lemmas (mature FSRS stability)',
    icon: 'school-outline',
  },
  {
    id: 'streak-7',
    title: 'Тиждень у пітьмі',
    description: 'Keep a 7-day goal streak',
    icon: 'flame-outline',
  },
  {
    id: 'streak-30',
    title: 'Місяць у сутінках',
    description: 'Keep a 30-day goal streak',
    icon: 'flame',
  },
  {
    id: 'streak-100',
    title: 'Сто ночей',
    description: 'Keep a 100-day goal streak',
    icon: 'bonfire-outline',
  },
  {
    id: 'first-checkpoint',
    title: 'Контрольну пройдено',
    description: 'Pass your first level checkpoint',
    icon: 'flag-outline',
  },
  {
    id: 'first-unit',
    title: 'Перший крок шляху',
    description: 'Complete your first course unit',
    icon: 'trail-sign-outline',
  },
  {
    id: 'first-dialogue-finished',
    title: 'Перша розмова',
    description: 'Finish your first spoken dialogue',
    icon: 'chatbubbles-outline',
  },
  {
    id: 'all-endings-one-dialogue',
    title: 'Усі кінцівки',
    description: 'Collect every ending of one dialogue',
    icon: 'git-branch-outline',
  },
  {
    id: 'first-scenario-finished',
    title: 'В ефірі',
    description: 'Finish your first blind speaking scenario',
    icon: 'radio-outline',
  },
  {
    id: 'scenario-clean-run',
    title: 'Без запинки',
    description: 'Finish a scenario with every turn clean — no misses, hints, skips or rescues',
    icon: 'sparkles-outline',
  },
  {
    id: 'scenario-family-all-rungs',
    title: 'Усі рівні',
    description: 'Finish every installed level of one scenario',
    icon: 'layers-outline',
  },
  ...EXAM_LEVEL_ACHIEVEMENTS,
  {
    id: 'pron-perfect',
    title: 'Чиста вимова',
    description: 'Score a perfect 100 in pronunciation practice',
    icon: 'mic-outline',
  },
  {
    id: 'level-5',
    title: 'П’ятий рівень',
    description: 'Reach XP level 5',
    icon: 'trending-up-outline',
  },
  {
    id: 'level-10',
    title: 'Десятий рівень',
    description: 'Reach XP level 10',
    icon: 'rocket-outline',
  },
];

export const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Streak achievements in ascending threshold order. */
export const STREAK_ACHIEVEMENTS: { id: string; days: number }[] = [
  { id: 'streak-7', days: 7 },
  { id: 'streak-30', days: 30 },
  { id: 'streak-100', days: 100 },
];

export const LEVEL_ACHIEVEMENTS: { id: string; level: number }[] = [
  { id: 'level-5', level: 5 },
  { id: 'level-10', level: 10 },
];

/** T18's "mature" band boundary — the mastery bar for mastered-100 (T24: shared const). */
export const MASTERED_STABILITY_DAYS = STABILITY_MATURE_MIN;
export const MASTERED_TARGET = 100;
export const BANK_TARGET = 100;
/** `exam-<level>-deck-100` (T70, UT16b): exam-deck cards of a level in the FSRS Review state. */
export const EXAM_DECK_TARGET = 100;
