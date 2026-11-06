import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

import { repos } from '@/db';
import {
  useExamAttempts,
  useExamDeckCounts,
  useExamTopicStats,
  useExams,
  usePacks,
  useStories,
} from '@/db/hooks';
import { localDateKey } from '@/db/repositories/stats';
import { trackTorfl } from '@/services/analytics';

import {
  buildExamListItems,
  buildTopicTiles,
  daysOutProp,
  groupTexts,
  type ExamListItem,
  type TextGroup,
  type TopicTile,
} from './hub-model';
import {
  computeReadiness,
  latestMockPcts,
  recommendToday,
  type ReadinessRow,
  type TodayStep,
} from './readiness';
import { stepAction, type TodayAction, type TopicTarget } from './today';
import { SUBTEST_ORDER } from './topics';
import type { ExamSubtestKind } from '@sutinki/schema';
import { profileFor, type TorflLevel } from './level-profile';
import type { ExamMode } from './model';
import { getExamDate, getStoredLevel, setExamDate, setStoredLevel } from './settings';

/**
 * «Іспит» screen hooks (T69): composition over the T68 `db/hooks` exam
 * queries — no DB access of their own beyond the settings accessors.
 */

/**
 * Library / hub exam rows: every installed exam with its best finished attempt.
 * `level` (T75) narrows both to one TORFL level; absent = every level (the Library shelves by pack).
 */
export function useExamListItems(
  mode?: ExamMode,
  level?: TorflLevel,
): {
  items: ExamListItem[];
  isPending: boolean;
} {
  const exams = useExams({ mode, level });
  const attempts = useExamAttempts({ limit: 500, level });
  const items = React.useMemo(
    () => buildExamListItems(exams.data ?? [], attempts.data ?? []),
    [exams.data, attempts.data],
  );
  return { items, isPending: exams.isPending };
}

/** The exam-date query key of one level (T75): `['torfl', 'exam-date', level]`. */
function examDateKey(level: TorflLevel) {
  return ['torfl', 'exam-date', level] as const;
}

/**
 * One level's exam date (`torfl.examDate` for A1, `torfl.examDateA2` for A2)
 * + today's local day key. `setDate` persists (null clears) and fires
 * `torfl_exam_date_set {daysOut, level}`.
 * `today` is re-read on every render, so a screen kept open over midnight
 * shows the new count on its next render.
 */
export function useExamDate(level: TorflLevel = 'A1') {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: examDateKey(level),
    queryFn: () => getExamDate(level),
  });
  const setDate = React.useCallback(
    async (date: string | null) => {
      await setExamDate(date, level);
      queryClient.setQueryData(examDateKey(level), date);
      trackTorfl('torfl_exam_date_set', { daysOut: daysOutProp(date, localDateKey()), level });
    },
    [queryClient, level],
  );
  return { date: query.data ?? null, today: localDateKey(), setDate, isPending: query.isPending };
}

/** Every level's exam date side by side. Fixed call order, so the hook rules hold. */
export function useExamDates(): Record<TorflLevel, ReturnType<typeof useExamDate>> {
  return {
    A1: useExamDate('A1'),
    A2: useExamDate('A2'),
    B1: useExamDate('B1'),
    B2: useExamDate('B2'),
    C1: useExamDate('C1'),
  };
}

/** The last-used hub level (`torfl.level`); null = none stored (a first visit). */
export function useStoredLevel() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['torfl', 'level'] as const, queryFn: getStoredLevel });
  const set = React.useCallback(
    async (level: TorflLevel) => {
      queryClient.setQueryData(['torfl', 'level'], level);
      await setStoredLevel(level);
    },
    [queryClient],
  );
  return { level: query.data ?? null, isPending: query.isPending, set };
}

/**
 * «Тексти»: every story of the installed exam packs, grouped by
 * the subtest that references it, with an audio flag per story. `level`
 * (T75) limits the texts to packs that have exams of that level.
 */
export function useExamTexts(level: TorflLevel = 'A1'): {
  groups: TextGroup[];
  total: number;
  isPending: boolean;
} {
  const exams = useExams({ level });
  const stories = useStories();
  const packs = usePacks();
  const examPackIds = React.useMemo(
    () => (packs.data ?? []).filter((p) => p.type === 'exam').map((p) => p.id),
    [packs.data],
  );
  const audio = useQuery({
    queryKey: ['exams', 'texts-audio', level, examPackIds.join(',')],
    queryFn: () => repos.content.listStoryKeysWithAudio(examPackIds),
  });
  const groups = React.useMemo(
    () => groupTexts(exams.data ?? [], stories.data ?? [], audio.data ?? new Set<string>()),
    [exams.data, stories.data, audio.data],
  );
  return {
    groups,
    total: groups.reduce((n, g) => n + g.texts.length, 0),
    isPending: exams.isPending || stories.isPending,
  };
}

// --- T70: readiness, deck and «Сьогодні» ----------------------------------------------

/** Per-kind accuracy over the last 200 objective responses (the readiness drill estimate). */
export function useExamRecentAccuracy(level: TorflLevel = 'A1') {
  return useQuery({
    queryKey: ['exams', 'recent-accuracy', level],
    queryFn: () => repos.exams.recentAccuracy({ level }),
  });
}

export interface TorflToday {
  /** The level this «Сьогодні» / hub view is for (T75). */
  level: TorflLevel;
  isPending: boolean;
  /** One readiness row per section of the level's shape, in exam order (also the hub card's mini-bars). */
  readiness: ReadinessRow[];
  deckDue: number;
  deckTotal: number;
  step: TodayStep | null;
  action: TodayAction | null;
  /** Topic tiles per subtest (drill exams). */
  tiles: Record<ExamSubtestKind, TopicTile[]>;
  /** topic slug → accuracy % over every scored answer (null = never answered). */
  accuracyByTopic: Map<string, number>;
  hasLightning: boolean;
  mockInstalled: boolean;
}

/**
 * Everything the hub, its Library card and the Today «Іспит» card show,
 * computed once from the T68 queries through the pure `readiness.ts` /
 * `today.ts` (no screen re-derives any of it).
 */
export function useTorflToday(level: TorflLevel = 'A1'): TorflToday {
  const exams = useExams({ level });
  const attempts = useExamAttempts({ limit: 500, level });
  const recent = useExamRecentAccuracy(level);
  const topicStats = useExamTopicStats({ level });
  const deck = useExamDeckCounts(level);
  // Render-pure «now»: readiness windows are days wide, so "as of the newest fetch" is exact
  // enough (and refetches on every hub focus / session end).
  const asOf = Math.max(
    attempts.dataUpdatedAt,
    recent.dataUpdatedAt,
    topicStats.dataUpdatedAt,
    deck.dataUpdatedAt,
  );

  return React.useMemo(() => {
    const now = asOf > 0 ? asOf : 0;
    const readiness = computeReadiness({
      level,
      now,
      mocks: latestMockPcts(attempts.data ?? []),
      drills: recent.data ?? {},
    });
    const tiles = buildTopicTiles(exams.data ?? []);
    const topicsByKind: Partial<Record<ExamSubtestKind, ReadonlySet<string>>> = {};
    const firstTopicOfKind: Partial<Record<ExamSubtestKind, string>> = {};
    const byTopic = new Map<string, TopicTarget>();
    for (const kind of SUBTEST_ORDER) {
      topicsByKind[kind] = new Set(tiles[kind].map((t) => t.topic));
      const first = tiles[kind][0];
      if (first) firstTopicOfKind[kind] = first.topic;
      for (const t of tiles[kind]) byTopic.set(t.topic, { packId: t.packId, examId: t.examId });
    }
    const stats = topicStats.data ?? [];
    const finished = (attempts.data ?? []).filter(
      (a) => a.status === 'finished' && a.mode === 'mock' && a.finishedAt !== null,
    );
    const lastMockAt = finished.reduce<number | null>(
      (m, a) => (m === null || a.finishedAt! > m ? a.finishedAt : m),
      null,
    );
    const deckDue = deck.data?.due ?? 0;
    const step = recommendToday({
      rows: readiness,
      topicsByKind,
      topicStats: stats,
      deckDue,
      lastMockAt,
      now,
      mockInstalled: (exams.data ?? []).some((e) => e.mode === 'mock'),
      passPct: profileFor(level).passPct,
    });
    const accuracyByTopic = new Map(
      stats
        .filter((s) => s.answered > 0)
        .map((s) => [s.topic, Math.round((s.correct / s.answered) * 100)]),
    );
    return {
      level,
      isPending: exams.isPending || attempts.isPending,
      readiness,
      deckDue,
      deckTotal: deck.data?.total ?? 0,
      step,
      action: step ? stepAction(step, byTopic, firstTopicOfKind) : null,
      tiles,
      accuracyByTopic,
      hasLightning: tiles.lexgram.length > 0,
      mockInstalled: (exams.data ?? []).some((e) => e.mode === 'mock'),
    };
  }, [
    level,
    exams.data,
    exams.isPending,
    attempts.data,
    attempts.isPending,
    recent.data,
    topicStats.data,
    deck.data,
    asOf,
  ]);
}

/**
 * Every level's «Сьогодні» side by side. Fixed call order, so the hook rules
 * hold; the queries are keyed per level and cached.
 */
export function useTorflLevelsToday(): Record<TorflLevel, TorflToday> {
  return {
    A1: useTorflToday('A1'),
    A2: useTorflToday('A2'),
    B1: useTorflToday('B1'),
    B2: useTorflToday('B2'),
    C1: useTorflToday('C1'),
  };
}
