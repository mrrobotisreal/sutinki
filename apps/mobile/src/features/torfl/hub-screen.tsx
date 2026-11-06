import { Ionicons } from '@expo/vector-icons';
import type { ExamSubtestKind } from '@sutinki/schema';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useActiveExamAttempt, useExamAttempts, useExams } from '@/db/hooks';
import type { ExamAttempt } from '@/db/repositories/exams';
import { useStudyAmbience } from '@/features/ambient-audio/activity';
import { pluralUk } from '@/lib/uk-plural';
import { cn } from '@/lib/cn';
import { trackTorfl } from '@/services/analytics';
import { useAppTheme } from '@/theme/use-app-theme';

import { useAnswers } from './answers/use-answers';
import { ExamDateSheet } from './exam-date-sheet';
import {
  EXAM_LEVELS,
  RELATIVE_NOTE,
  hubSubtitle,
  lightningCaption,
  profileFor,
  sectionKindsOf,
  thresholdLine,
  type TorflLevel,
} from './level-profile';
import { ExamRow } from './exam-row';
import {
  useExamDate,
  useExamListItems,
  useExamTexts,
  useStoredLevel,
  useTorflToday,
} from './hooks';
import {
  MODE_LABELS,
  countdownLabel,
  overallPct,
  placeholderReadiness,
  type ReadinessView,
} from './hub-model';
import { drillHref } from './drill/drill-model';
import { ReadinessBars } from './readiness-bars';
import { describeStep } from './today';
import { TextRow } from './text-row';
import { SUBTEST_LABELS, topicLabel } from './topics';
import {
  monologueTickets,
  speakingPracticeEntries,
  speakingPracticeHref,
  ticketHref,
} from './speaking/tickets-model';
import {
  writingPracticeEntries,
  writingPracticeGroups,
  writingPracticeHref,
} from './writing/writing-practice-model';
import { minutesUk } from './minutes-uk';

export type HubOpenedFrom = 'library' | 'today' | 'deeplink';

const ITEMS = ['завдання', 'завдання', 'завдань'] as const;
/** «Тексти» preview length on the hub (the full list is `/torfl/texts`). */
const TEXTS_PREVIEW = 5;

/**
 * The «Іспит» hub (T69, re-targeted by UT16b) — a calm study desk, top to
 * bottom: the LEVEL TAB ROW A1 · A2 · B1 · B2 · C1, the header (title,
 * countdown → date sheet), «Готовність» (live bars per section of the level +
 * the pass threshold), «Сьогодні» (the recommended next step), «Робота над
 * помилками» + quick-round rows, «Пробні іспити», «Тренування» (a tab strip
 * built from the LEVEL'S sections, topic tiles from drill exams), «Тексти»,
 * «Історія». A level with no installed pack shows a designed empty state.
 * `readiness` is T70's seam.
 */
/**
 * The hub (route `/torfl`): the LEVEL TAB ROW on top, then the chosen level's
 * desk. Default level = an explicit `?level=` route param, else the last used
 * (`torfl.level`), else the lowest level with an installed pack, else B1 —
 * Mitch's target.
 */
export function TorflHubScreen({
  from,
  readiness,
  level: routeLevel,
}: {
  from: HubOpenedFrom;
  readiness?: readonly ReadinessView[];
  /** The `?level=` route param, already parsed; undefined = no param. */
  level?: TorflLevel;
}) {
  const { tokens } = useAppTheme();
  const allExams = useExams({});
  const stored = useStoredLevel();
  const [picked, setPicked] = React.useState<TorflLevel | null>(null);
  const withPacks = React.useMemo(() => {
    const set = new Set<string>();
    for (const e of allExams.data ?? []) if (e.exam) set.add(e.exam.level);
    return set;
  }, [allExams.data]);
  if (allExams.isPending || stored.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }
  const level: TorflLevel =
    picked ?? routeLevel ?? stored.level ?? EXAM_LEVELS.find((l) => withPacks.has(l)) ?? 'B1';
  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row gap-2 px-4 pb-1 pt-3" accessibilityRole="tablist">
        {EXAM_LEVELS.map((l) => {
          const selected = l === level;
          return (
            <Pressable
              key={l}
              onPress={() => {
                setPicked(l);
                void stored.set(l);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`Рівень ${l}`}
              testID={`torfl-level-tab-${l}`}
              className={cn(
                'flex-1 items-center rounded-full border py-2',
                selected ? 'border-accent bg-accent-soft' : 'border-border active:bg-surface-2',
              )}
            >
              <Text
                className={cn(
                  'font-ui-bold text-sm',
                  selected ? 'text-accent' : withPacks.has(l) ? 'text-text' : 'text-text-muted',
                )}
              >
                {l}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <LevelHub key={level} from={from} readiness={readiness} level={level} />
    </View>
  );
}

/** The designed empty state of a level with no installed pack (B2/C1 permanently). */
function LevelEmptyState({ level }: { level: TorflLevel }) {
  const router = useRouter();
  const { tokens } = useAppTheme();
  const permanent = level === 'B2' || level === 'C1';
  return (
    <View
      className="items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-8"
      testID={`torfl-empty-${level}`}
    >
      <Ionicons
        name={permanent ? 'hourglass-outline' : 'cloud-download-outline'}
        size={32}
        color={tokens.textMuted}
      />
      <Text className="text-center font-ui-medium">
        {permanent
          ? 'Для цього рівня ще немає матеріалів'
          : 'Матеріали зʼявляться після синхронізації'}
      </Text>
      <Text variant="muted" className="text-center">
        {permanent
          ? 'Тут будуть пробні іспити, тренування за темами й тексти — коли вони зʼявляться.'
          : 'Пробні іспити, тренування за темами та тексти для читання й слухання.'}
      </Text>
      {!permanent && (
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          testID="torfl-empty-sync"
          className="rounded-full bg-accent px-5 py-2.5 active:opacity-80"
        >
          <Text className="font-ui-medium text-bg">Налаштування → Синхронізація контенту</Text>
        </Pressable>
      )}
    </View>
  );
}

function LevelHub({
  from,
  readiness,
  level,
}: {
  from: HubOpenedFrom;
  readiness?: readonly ReadinessView[];
  level: TorflLevel;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  useStudyAmbience(true, 'education');
  const profile = profileFor(level);

  const exams = useExams({ level });
  const mocks = useExamListItems('mock', level);
  const texts = useExamTexts(level);
  const attempts = useExamAttempts({ limit: 20, level });
  const activeAttempt = useActiveExamAttempt(level);
  const answers = useAnswers(level);
  const { date, today, setDate } = useExamDate(level);
  const [dateOpen, setDateOpen] = React.useState(false);
  const [tab, setTab] = React.useState<ExamSubtestKind>(sectionKindsOf(level)[0] ?? 'listening');

  // Fresh data on every focus (an attempt finished in T70/T71 comes back here).
  useFocusEffect(
    React.useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ['exams'] });
    }, [queryClient]),
  );
  const openedRef = React.useRef(false);
  React.useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    trackTorfl('torfl_hub_opened', { from, level });
  }, [from, level]);

  const torfl = useTorflToday(level);
  const tiles = torfl.tiles;
  const titleOf = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const e of exams.data ?? []) map.set(`${e.packId}/${e.examId}`, e.titleUk);
    return map;
  }, [exams.data]);

  const openIntro = React.useCallback(
    (packId: string, examId: string) =>
      router.push({ pathname: '/exam/[packId]/[examId]', params: { packId, examId } }),
    [router],
  );

  if (exams.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  const nothingInstalled = (exams.data ?? []).length === 0;
  // Tabs come from the LEVEL'S sections (never a fixed list); study-only grammar drills join when present.
  const tabKinds: ExamSubtestKind[] = [
    ...sectionKindsOf(level),
    ...(tiles.lexgram.length > 0 ? (['lexgram'] as const) : []),
  ];
  const tabTiles = tiles[tab];
  // T72: the Письмо tab lists letter tasks (drill sets first, then mocks) as untimed practice.
  const writingEntries = tab === 'writing' ? writingPracticeEntries(exams.data ?? []) : [];
  // T73: the Говоріння tab lists task-1 / task-2 items for one-by-one practice; «Білети» = task 3.
  const speakingEntries = tab === 'speaking' ? speakingPracticeEntries(exams.data ?? []) : [];
  const ticketCount = monologueTickets(exams.data ?? []).length;
  const preview = texts.groups.flatMap((g) => g.texts).slice(0, TEXTS_PREVIEW);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="gap-7 px-4 pt-4"
      contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
    >
      {/* ---- header ---- */}
      <View className="gap-3 rounded-2xl border border-border bg-surface px-4 py-4">
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-accent-soft">
            <Ionicons name="ribbon-outline" size={22} color={tokens.accent} />
          </View>
          <View className="flex-1">
            <Text className="font-ui-bold text-lg">{profile.chipLabel}</Text>
            <Text variant="caption">{hubSubtitle(level)}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => setDateOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${countdownLabel(date, today)}. Змінити дату іспиту`}
          testID="torfl-exam-date"
          className="flex-row items-center gap-2 self-start rounded-full border border-border px-3 py-1.5 active:bg-surface-2"
        >
          <Ionicons
            name="calendar-outline"
            size={15}
            color={date ? tokens.accent : tokens.textMuted}
          />
          <Text className={cn('font-ui-medium text-sm', date ? 'text-accent' : 'text-text-muted')}>
            {countdownLabel(date, today)}
          </Text>
        </Pressable>
        <Text variant="caption">{thresholdLine(level)}</Text>
      </View>

      {nothingInstalled && <LevelEmptyState level={level} />}

      {/* ---- readiness ---- */}
      <Section title="Готовність">
        <View className="rounded-xl border border-border bg-surface px-4 py-4">
          <ReadinessBars
            passPct={profile.passPct}
            rows={readiness ?? (torfl.isPending ? placeholderReadiness(level) : torfl.readiness)}
          />
          <Text variant="caption" className="mt-3" testID="torfl-threshold">
            {thresholdLine(level)} · {RELATIVE_NOTE}
          </Text>
        </View>
      </Section>

      {/* ---- today ---- */}
      <Section title="Сьогодні">
        {torfl.step ? (
          <Pressable
            onPress={() => {
              const action = torfl.action;
              if (action?.kind === 'drill') {
                router.push(
                  action.source === 'deck'
                    ? drillHref({ source: 'deck', level })
                    : drillHref({
                        source: 'set',
                        packId: action.packId,
                        examId: action.examId,
                        topic: action.topic,
                        level,
                      }),
                );
              }
            }}
            accessibilityRole="button"
            testID="torfl-today-step"
            className="flex-row items-center gap-3 rounded-xl border border-accent/40 bg-surface px-4 py-3 active:bg-surface-2"
          >
            <Ionicons name="compass-outline" size={20} color={tokens.accent} />
            <View className="flex-1 gap-0.5">
              <Text className="font-ui-medium">{describeStep(torfl.step).title}</Text>
              <Text variant="caption">{describeStep(torfl.step).caption}</Text>
            </View>
            {torfl.action?.kind === 'drill' && (
              <Ionicons name="play-circle" size={24} color={tokens.accent} />
            )}
          </Pressable>
        ) : (
          <View className="flex-row items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3">
            <Ionicons name="compass-outline" size={18} color={tokens.textMuted} />
            <Text variant="muted" className="flex-1">
              Розвʼязуй тренування — тут зʼявиться наступний крок: найслабша тема, картки «Роботи
              над помилками» або пробний іспит.
            </Text>
          </View>
        )}
      </Section>

      {/* ---- mocks ---- */}
      <Section title="Пробні іспити">
        {activeAttempt.data?.status === 'active' && activeAttempt.data.mode === 'mock' && (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/exam/run/[attemptId]',
                params: { attemptId: activeAttempt.data!.id },
              })
            }
            accessibilityRole="button"
            testID="torfl-resume-banner"
            className="mb-2 flex-row items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3 active:opacity-80"
          >
            <Ionicons name="play-circle" size={22} color={tokens.accent} />
            <View className="flex-1 gap-0.5">
              <Text className="font-ui-medium">Продовжити пробний іспит</Text>
              <Text variant="caption">
                {titleOf.get(`${activeAttempt.data.packId}/${activeAttempt.data.examId}`) ??
                  activeAttempt.data.examId}{' '}
                · таймер іде за годинником
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={tokens.textMuted} />
          </Pressable>
        )}
        {mocks.items.length === 0 ? (
          <EmptyLine text="Пробних іспитів поки немає — вони зʼявляться після синхронізації." />
        ) : (
          mocks.items.map((item) => (
            <ExamRow
              key={`${item.packId}/${item.examId}`}
              item={item}
              onPress={() => openIntro(item.packId, item.examId)}
            />
          ))
        )}
      </Section>

      {/* ---- drills ---- */}
      <Section title="Тренування">
        <View className="mb-3 gap-2">
          <Pressable
            onPress={() => router.push(drillHref({ source: 'deck', level }))}
            accessibilityRole="button"
            accessibilityState={{ disabled: torfl.deckDue === 0 }}
            testID="torfl-deck-row"
            className="flex-row items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 active:bg-surface-2"
          >
            <Ionicons name="albums-outline" size={20} color={tokens.accent} />
            <View className="flex-1 gap-0.5">
              <Text className="font-ui-medium">Робота над помилками · {torfl.deckDue}</Text>
              <Text variant="caption">
                {torfl.deckDue > 0
                  ? 'Картки з твоїми помилками — час повторити'
                  : torfl.deckTotal > 0
                    ? `Сьогодні повторювати нічого · у колоді ${torfl.deckTotal}`
                    : 'Зʼявиться після першого тренування'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={tokens.textMuted} />
          </Pressable>
          {torfl.hasLightning && (
            <Pressable
              onPress={() => router.push(drillHref({ source: 'lightning', level }))}
              accessibilityRole="button"
              testID="torfl-lightning-row"
              className="flex-row items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 active:bg-surface-2"
            >
              <Ionicons name="flash-outline" size={20} color={tokens.accent} />
              <View className="flex-1 gap-0.5">
                <Text className="font-ui-medium">Швидкий раунд</Text>
                <Text variant="caption">{lightningCaption(level)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={tokens.textMuted} />
            </Pressable>
          )}
          {ticketCount > 0 && (
            <Pressable
              onPress={() => router.push(ticketHref(level))}
              accessibilityRole="button"
              testID="torfl-tickets-row"
              className="flex-row items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 active:bg-surface-2"
            >
              <Ionicons name="mic-outline" size={20} color={tokens.accent} />
              <View className="flex-1 gap-0.5">
                <Text className="font-ui-medium">Білети · {ticketCount}</Text>
                <Text variant="caption">
                  {`Тягнеш тему монологу — ${minutesUk(profile.monologueDefaults.prepSec)} підготовки, ${minutesUk(profile.monologueDefaults.answerSec)} відповіді, запис`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={tokens.textMuted} />
            </Pressable>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
          className="-mx-4 mb-3"
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {tabKinds.map((kind) => {
            const selected = kind === tab;
            const n =
              kind === 'writing'
                ? writingPracticeEntries(exams.data ?? []).length
                : kind === 'speaking'
                  ? speakingPracticeEntries(exams.data ?? []).length
                  : tiles[kind].length;
            return (
              <Pressable
                key={kind}
                onPress={() => setTab(kind)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                testID={`torfl-drill-tab-${kind}`}
                className={cn(
                  'flex-row items-center gap-1.5 rounded-full border px-3 py-1.5',
                  selected ? 'border-accent bg-accent-soft' : 'border-border active:bg-surface-2',
                )}
              >
                <Ionicons
                  name={SUBTEST_LABELS[kind].icon}
                  size={14}
                  color={selected ? tokens.accent : tokens.textMuted}
                />
                <Text
                  className={cn(
                    'font-ui-medium text-sm',
                    selected ? 'text-accent' : 'text-text-muted',
                  )}
                >
                  {SUBTEST_LABELS[kind].short}
                  {n > 0 ? ` · ${n}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {tab === 'writing' ? (
          writingEntries.length === 0 ? (
            <EmptyLine text="Завдання з письма зʼявляться разом з іспитами." />
          ) : (
            <View className="gap-2">
              {writingPracticeGroups(writingEntries).map((group) => (
                <View key={group.key} className="gap-2" testID={`torfl-writing-group-${group.key}`}>
                  {group.titleUk && (
                    <Text
                      variant="caption"
                      className="px-1 pt-1 font-ui-medium uppercase tracking-wider"
                    >
                      {group.titleUk}
                    </Text>
                  )}
                  {group.entries.map((e) => (
                    <Pressable
                      key={`${e.packId}/${e.examId}/${e.item.id}`}
                      onPress={() => router.push(writingPracticeHref(e))}
                      accessibilityRole="button"
                      testID={`torfl-writing-${e.item.id}`}
                      className="flex-row items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 active:bg-surface-2"
                    >
                      <Ionicons name="create-outline" size={20} color={tokens.accent} />
                      <View className="flex-1 gap-0.5">
                        <Text className="font-ui-medium" numberOfLines={2}>
                          {e.item.task.uk}
                        </Text>
                        <Text variant="caption" numberOfLines={1}>
                          {e.examTitleUk} · {e.item.bullets.length}{' '}
                          {pluralUk(e.item.bullets.length, ['пункт', 'пункти', 'пунктів'])} · без
                          таймера
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={tokens.textMuted} />
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          )
        ) : tab === 'speaking' ? (
          speakingEntries.length === 0 ? (
            <EmptyLine text="Завдання з говоріння зʼявляться разом з іспитами." />
          ) : (
            <View className="gap-2">
              {speakingEntries.map((e) => (
                <Pressable
                  key={`${e.packId}/${e.examId}/${e.item.id}`}
                  onPress={() => router.push(speakingPracticeHref(e))}
                  accessibilityRole="button"
                  testID={`torfl-speaking-${e.item.id}`}
                  className="flex-row items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 active:bg-surface-2"
                >
                  <Ionicons name="mic-outline" size={20} color={tokens.accent} />
                  <View className="flex-1 gap-0.5">
                    <Text className="font-ui-medium" numberOfLines={2}>
                      {e.item.kind === 'speaking-situation' && e.item.situation
                        ? e.item.situation.uk
                        : e.item.expect.accept[0]}
                    </Text>
                    <Text variant="caption" numberOfLines={1}>
                      {e.examTitleUk} ·{' '}
                      {e.item.kind === 'speaking-reply'
                        ? 'завдання 1 · відповідь'
                        : 'завдання 2 · ситуація'}{' '}
                      · без таймера
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={tokens.textMuted} />
                </Pressable>
              ))}
            </View>
          )
        ) : tabTiles.length === 0 ? (
          <EmptyLine text={`Тренувань із розділу «${SUBTEST_LABELS[tab].uk}» поки немає.`} />
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {tabTiles.map((tile) => (
              <Pressable
                key={tile.topic}
                onPress={() =>
                  router.push(
                    drillHref({
                      source: 'set',
                      packId: tile.packId,
                      examId: tile.examId,
                      topic: tile.topic,
                      level,
                    }),
                  )
                }
                onLongPress={() => openIntro(tile.packId, tile.examId)}
                accessibilityRole="button"
                accessibilityHint="Довге натискання — увесь набір тренувань"
                accessibilityLabel={`${topicLabel(tile.topic).uk}: ${tile.itemCount} ${pluralUk(tile.itemCount, ITEMS)}`}
                testID={`torfl-topic-${tile.topic}`}
                className="w-[48.5%] gap-1 rounded-xl border border-border bg-surface px-3 py-3 active:bg-surface-2"
              >
                <Text className="font-ui-medium" numberOfLines={2}>
                  {topicLabel(tile.topic).uk}
                </Text>
                <Text variant="caption" className="text-xs" numberOfLines={1}>
                  {topicLabel(tile.topic).en}
                </Text>
                <View className="mt-1 flex-row items-center justify-between">
                  <Text variant="caption">
                    {tile.itemCount} {pluralUk(tile.itemCount, ITEMS)}
                  </Text>
                  <Text variant="caption" testID={`torfl-topic-acc-${tile.topic}`}>
                    {torfl.accuracyByTopic.has(tile.topic)
                      ? `${torfl.accuracyByTopic.get(tile.topic)}%`
                      : '—'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </Section>

      {/* ---- my answers (T74) ---- */}
      <Section
        title="Мої відповіді"
        action={{
          label: 'Усі',
          onPress: () => router.push({ pathname: '/torfl/answers', params: { level } }),
        }}
      >
        <Pressable
          onPress={() => router.push({ pathname: '/torfl/answers', params: { level } })}
          accessibilityRole="button"
          testID="torfl-answers-row"
          className="flex-row items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 active:bg-surface-2"
        >
          <Ionicons name="chatbubbles-outline" size={20} color={tokens.accent} />
          <View className="flex-1 gap-0.5">
            <Text className="font-ui-medium">
              {answers.data && answers.data.entryCount > 0
                ? `Мої відповіді · ${answers.data.entryCount}`
                : 'Мої відповіді'}
            </Text>
            <Text variant="caption">
              {answers.data && answers.data.promptCount > 0
                ? `Твої відповіді на ${answers.data.promptCount} ${pluralUk(answers.data.promptCount, ['тему', 'теми', 'тем'])} іспиту — напиши й відрепетируй вголос`
                : 'Власні відповіді на теми іспиту: написати, отримати правки, відрепетирувати вголос'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={tokens.textMuted} />
        </Pressable>
      </Section>

      {/* ---- texts ---- */}
      <Section
        title="Тексти"
        action={
          texts.total > 0
            ? {
                label: `Усі · ${texts.total}`,
                onPress: () => router.push({ pathname: '/torfl/texts', params: { level } }),
              }
            : undefined
        }
      >
        {preview.length === 0 ? (
          <EmptyLine text="Тексти для читання й слухання зʼявляться разом з іспитами." />
        ) : (
          preview.map((text) => (
            <TextRow key={`${text.packId}/${text.storyId}`} text={text} from="texts" />
          ))
        )}
      </Section>

      {/* ---- history ---- */}
      <Section title="Історія">
        {(attempts.data ?? []).length === 0 ? (
          <EmptyLine text="Спроб поки немає. Тут будуть пробні іспити й тренування." />
        ) : (
          (attempts.data ?? []).map((a) => (
            <AttemptRow
              key={a.id}
              attempt={a}
              title={titleOf.get(`${a.packId}/${a.examId}`)}
              onOpen={
                a.mode !== 'mock'
                  ? undefined
                  : a.status === 'active'
                    ? () =>
                        router.push({
                          pathname: '/exam/run/[attemptId]',
                          params: { attemptId: a.id },
                        })
                    : a.status === 'finished'
                      ? () =>
                          router.push({
                            pathname: '/exam/results/[attemptId]',
                            params: { attemptId: a.id },
                          })
                      : undefined
              }
            />
          ))
        )}
      </Section>

      <ExamDateSheet
        key={dateOpen ? 'open' : 'closed'}
        open={dateOpen}
        current={date}
        today={today}
        onClose={() => setDateOpen(false)}
        onSave={(next) => {
          setDateOpen(false);
          void setDate(next);
        }}
      />
    </ScrollView>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  return (
    <View>
      <View className="mb-2.5 flex-row items-baseline justify-between px-1">
        <Text variant="caption" className="font-ui-medium uppercase tracking-wider">
          {title}
        </Text>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button">
            <Text className="font-ui-medium text-sm text-accent">{action.label}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <Text variant="muted" className="px-1">
      {text}
    </Text>
  );
}

const STATUS_LABELS: Record<ExamAttempt['status'], string> = {
  active: 'триває',
  finished: 'завершено',
  abandoned: 'перервано',
};

function AttemptRow({
  attempt,
  title,
  onOpen,
}: {
  attempt: ExamAttempt;
  title: string | undefined;
  onOpen?: () => void;
}) {
  const pct = overallPct(attempt.results);
  const when = new Date(attempt.startedAt).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
  });
  const verdictText =
    attempt.verdict === 'pass'
      ? 'склав би'
      : attempt.verdict === 'pass-borderline'
        ? 'склав би (на межі)'
        : attempt.verdict === 'fail'
          ? 'не склав би'
          : null;
  const scope =
    attempt.mode === 'mock' ? (attempt.scope === 'full' ? ' · увесь іспит' : ' · один розділ') : '';
  const Row = onOpen ? Pressable : View;
  return (
    <Row
      {...(onOpen ? { onPress: onOpen, accessibilityRole: 'button' as const } : {})}
      testID={`history-${attempt.id}`}
      className="mb-2 flex-row items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 active:bg-surface-2"
    >
      <View className="flex-1 gap-0.5">
        <Text className="font-ui-medium" numberOfLines={1}>
          {title ?? attempt.examId}
        </Text>
        <Text variant="caption">
          {when} · {MODE_LABELS[attempt.mode]}
          {scope} · {STATUS_LABELS[attempt.status]}
          {verdictText ? ` · ${verdictText}` : ''}
        </Text>
      </View>
      <Text variant="caption">{pct === null ? '—' : `${pct.toLocaleString('uk-UA')} %`}</Text>
      {onOpen ? <Ionicons name="chevron-forward" size={14} color="#888" /> : null}
    </Row>
  );
}
