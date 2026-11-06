import { Ionicons } from '@expo/vector-icons';
import type { Exam } from '@sutinki/schema';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QueryError } from '@/components/query-error';
import { Text } from '@/components/ui/text';
import { useExam, useExamAttempt } from '@/db/hooks';
import { cn } from '@/lib/cn';
import { useAppTheme } from '@/theme/use-app-theme';

import { drillHref } from './drill/drill-model';
import { useGradingQueue } from './grading/queue';
import { MODE_LABELS } from './hub-model';
import { BAND_BAR_CLASS, BAND_TEXT_CLASS, bandFor } from './readiness';
import {
  buildResultRows,
  formatUsed,
  missingVerdictLine,
  pendingCountLine,
  pctsFromRows,
  provisionalFromRows,
  topicBreakdown,
  type ResultRow,
} from './results-model';
import { MODELLED_BADGE, RELATIVE_NOTE, profileFor, torflLevelOf } from './level-profile';
import { PinButton } from './speaking/pin-button';
import { SUBTEST_LABELS, topicLabel } from './topics';
import { marginLabel, verdict as computeVerdict, verdictHeadline } from './verdict';

/**
 * The mock results (T71, UT17) — route `/exam/results/[attemptId]`: the
 * verdict card under the state pass rule (total ≥ threshold, no per-section
 * floor; or «Вердикт — після …» while a section is missing) with the weighted
 * total and the margin, one row per section of the level with the threshold
 * tick, points / max, time used and «пропущено» for skipped ones, the topic
 * breakdown with «Тренувати» links into the drill, and «Розбір» into the review.
 */
export function ExamResultsScreen({ attemptId }: { attemptId: string }) {
  const { tokens } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const attempt = useExamAttempt(attemptId);
  const exam = useExam(attempt.data?.packId, attempt.data?.examId);
  // T72: an AI / self grade landing re-renders the results in place (provisional → final).
  const gradedVersion = useGradingQueue((s) => s.gradedVersion);
  const refetch = attempt.refetch;
  React.useEffect(() => {
    if (gradedVersion > 0) void refetch();
  }, [gradedVersion, refetch]);

  if (attempt.isPending || (attempt.data && exam.isPending)) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }
  if (!attempt.data || !exam.data) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-bg px-8">
        <QueryError message="Результат не знайдено." onRetry={() => router.back()} />
      </View>
    );
  }
  return (
    <ResultsBody
      attemptId={attemptId}
      exam={exam.data}
      attempt={attempt.data}
      top={insets.top}
      bottom={insets.bottom}
      onPinChanged={() => void refetch()}
    />
  );
}

function ResultsBody({
  attemptId,
  exam,
  attempt,
  top,
  bottom,
  onPinChanged,
}: {
  attemptId: string;
  exam: Exam;
  attempt: NonNullable<ReturnType<typeof useExamAttempt>['data']>;
  top: number;
  bottom: number;
  onPinChanged: () => void;
}) {
  const { tokens } = useAppTheme();
  const router = useRouter();
  const rows = buildResultRows(exam, attempt);
  const level = torflLevelOf(exam.level);
  const profile = profileFor(exam.level);
  const pcts = pctsFromRows(rows);
  const full = attempt.scope === 'full';
  const v = full ? computeVerdict(pcts, provisionalFromRows(rows), level) : null;
  const scoredIds = rows.filter((r) => r.status === 'scored').map((r) => r.subtestId);
  const responses = attempt.responses;
  const answers = React.useMemo(() => {
    const out: Record<string, NonNullable<(typeof responses)[number]['answer']>> = {};
    for (const r of responses) if (r.answer) out[r.itemId] = r.answer;
    return out;
  }, [responses]);
  const topics = topicBreakdown(exam, scoredIds, answers);
  const weak = topics.filter((t) => t.accuracy < 1).slice(0, 6);
  const active = attempt.status === 'active';
  // T74 (§8.5): the pin keeps this attempt's speaking recordings from the prune — shown only
  // when the attempt has (or had) recordings.
  const hasRecordings = responses.some(
    (r) => r.answer && 'recordingPath' in r.answer && r.answer.recordingPath !== undefined,
  );

  const when = new Date(attempt.finishedAt ?? attempt.startedAt).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="gap-6 px-4"
      contentContainerStyle={{ paddingTop: top + 12, paddingBottom: bottom + 40 }}
      testID="exam-results"
    >
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Назад"
          className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-2"
        >
          <Ionicons name="chevron-back" size={22} color={tokens.text} />
        </Pressable>
        <View className="flex-1">
          <Text className="font-reading-bold text-xl" numberOfLines={2}>
            {exam.title.uk}
          </Text>
          <Text variant="caption">
            {MODE_LABELS[attempt.mode]} · {when}
            {attempt.status === 'abandoned' ? ' · перервана' : ''}
            {attempt.pinned ? ' · закріплена' : ''}
          </Text>
        </View>
        {hasRecordings ? (
          <PinButton
            attemptId={attemptId}
            pinned={attempt.pinned}
            onChanged={onPinChanged}
            level={level}
          />
        ) : null}
      </View>

      {full && v ? (
        <VerdictCard v={v} xp={attempt.xpAwarded} sectionCount={profile.sections.length} />
      ) : null}
      {full ? (
        <Text variant="caption" className="px-1" testID="results-note">
          {profile.modelled && exam.format === 'ukr-state' ? `${MODELLED_BADGE} · ` : ''}
          {RELATIVE_NOTE}
        </Text>
      ) : null}
      {!full ? (
        <View className="rounded-2xl border border-border bg-surface px-4 py-3">
          <Text variant="muted">
            Один розділ — «склав чи ні» рахується за сумою всіх розділів, тому тут лише відсотки.
          </Text>
          {attempt.xpAwarded > 0 ? (
            <Text className="mt-1 font-ui-medium text-accent">+{attempt.xpAwarded} XP</Text>
          ) : null}
        </View>
      ) : null}

      <View className="gap-3">
        <SectionTitle>Розділи</SectionTitle>
        <View className="gap-4 rounded-2xl border border-border bg-surface px-4 py-4">
          {rows.map((r) => (
            <SubtestRow
              key={r.subtestId}
              row={r}
              passPct={profile.passPct}
              onOpen={
                r.status === 'scored' && !active && (r.kind === 'writing' || r.kind === 'speaking')
                  ? () =>
                      router.push({
                        pathname:
                          r.kind === 'writing'
                            ? '/exam/writing/[attemptId]'
                            : '/exam/speaking/[attemptId]',
                        params: { attemptId },
                      })
                  : undefined
              }
              pending={
                (r.kind === 'writing' || r.kind === 'speaking') &&
                attempt.responses.some(
                  (x) => x.subtestId === r.subtestId && x.gradingStatus === 'pending-ai',
                )
              }
              failed={
                (r.kind === 'writing' || r.kind === 'speaking') &&
                attempt.responses.some(
                  (x) => x.subtestId === r.subtestId && x.gradingStatus === 'ai-failed',
                )
              }
            />
          ))}
        </View>
        <Text variant="caption" className="px-1">
          Риска на смузі — {profile.passPct} %: поріг для суми всіх розділів. Окремого мінімуму за
          розділ немає.
        </Text>
      </View>

      {weak.length > 0 && (
        <View className="gap-3">
          <SectionTitle>Слабкі теми</SectionTitle>
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            {weak.map((t, i) => (
              <View
                key={`${t.kind}-${t.topic}`}
                className={cn(
                  'flex-row items-center gap-3 px-4 py-3',
                  i > 0 && 'border-t border-border',
                )}
              >
                <View className="flex-1">
                  <Text className="font-ui-medium">{topicLabel(t.topic).uk}</Text>
                  <Text variant="caption">
                    {SUBTEST_LABELS[t.kind].short} · {t.correct} з {t.total} правильно
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    router.push(
                      drillHref({
                        source: 'set',
                        packId: attempt.packId,
                        examId: attempt.examId,
                        topic: t.topic,
                      }),
                    );
                  }}
                  accessibilityRole="button"
                  testID={`train-${t.topic}`}
                  className="rounded-full border border-accent px-3 py-1.5 active:bg-accent-soft"
                >
                  <Text className="font-ui-medium text-sm text-accent">Тренувати</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <Text variant="caption" className="px-1">
            «Тренувати» відкриває завдання цієї теми з тренувальних наборів, якщо вони встановлені.
          </Text>
        </View>
      )}

      {!active && scoredIds.length > 0 && (
        <Pressable
          onPress={() =>
            router.push({ pathname: '/exam/review/[attemptId]', params: { attemptId } })
          }
          accessibilityRole="button"
          testID="results-review"
          className="flex-row items-center justify-center gap-2 rounded-full bg-accent px-5 py-3.5 active:opacity-80"
        >
          <Ionicons name="list-outline" size={18} color={tokens.bg} />
          <Text className="font-ui-bold text-bg">Розбір завдань</Text>
        </Pressable>
      )}
      <Text variant="caption" className="px-1 text-center">
        Помилки вже в колоді «Робота над помилками» — повторюй їх у розділі «Іспит».
      </Text>
    </ScrollView>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="caption" className="px-1 font-ui-medium uppercase tracking-wider">
      {children}
    </Text>
  );
}

function VerdictCard({
  v,
  xp,
  sectionCount,
}: {
  v: ReturnType<typeof computeVerdict>;
  xp: number;
  sectionCount: number;
}) {
  const { tokens } = useAppTheme();
  if (v.verdict === null) {
    return (
      <View
        className="gap-2 rounded-2xl border border-border bg-surface px-5 py-5"
        testID="verdict-card"
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="hourglass-outline" size={20} color={tokens.textMuted} />
          <Text className="font-ui-bold text-lg" testID="verdict-pending">
            {missingVerdictLine(v.missing)}
          </Text>
        </View>
        <Text variant="muted">{pendingCountLine(sectionCount, v.missing.length)}</Text>
        {xp > 0 ? <Text className="font-ui-medium text-accent">+{xp} XP</Text> : null}
      </View>
    );
  }
  const pass = v.verdict === 'pass';
  return (
    <View
      className={cn(
        'gap-2 rounded-2xl border px-5 py-5',
        pass ? 'border-success bg-success/10' : 'border-danger bg-danger/10',
      )}
      testID="verdict-card"
    >
      <View className="flex-row items-center gap-2">
        <Ionicons
          name={pass ? 'ribbon' : 'refresh-circle'}
          size={22}
          color={pass ? tokens.success : tokens.danger}
        />
        <Text className="flex-1 font-ui-bold text-lg" testID="verdict-headline">
          {verdictHeadline(v.verdict)}
        </Text>
      </View>
      <Text testID="verdict-total">
        Сума: {(Math.floor(v.total * 10 + 1e-9) / 10).toLocaleString('uk-UA')} % · поріг {v.passPct}{' '}
        % · {marginLabel(v.margin)}
      </Text>
      {v.retake.length > 0 ? (
        <Text testID="verdict-retake">
          Перездати: {v.retake.map((k) => SUBTEST_LABELS[k].uk).join(', ')}
        </Text>
      ) : null}
      {v.provisional ? (
        <View className="self-start rounded-full bg-track-warm-soft px-2.5 py-0.5">
          <Text className="font-ui-medium text-xs text-track-warm">
            попередньо — чекає на оцінку ШІ
          </Text>
        </View>
      ) : null}
      {xp > 0 ? <Text className="font-ui-medium text-accent">+{xp} XP</Text> : null}
    </View>
  );
}

function SubtestRow({
  row,
  passPct,
  onOpen,
  pending = false,
  failed = false,
}: {
  row: ResultRow;
  passPct: number;
  /** T72: the writing row opens its review. */
  onOpen?: () => void;
  /** T72: an AI grade is on its way / failed (the row says so under the badge). */
  pending?: boolean;
  failed?: boolean;
}) {
  const { tokens } = useAppTheme();
  const band = row.pct !== null ? bandFor(row.pct, passPct) : null;
  const used = row.status === 'scored' ? formatUsed(row.timeUsedSec) : '';
  const Wrap = onOpen ? Pressable : View;
  return (
    <Wrap
      className="gap-1.5"
      testID={`result-${row.kind}`}
      {...(onOpen
        ? {
            onPress: onOpen,
            accessibilityRole: 'button' as const,
            accessibilityHint:
              row.kind === 'speaking' ? 'Відкрити розбір говоріння' : 'Відкрити розбір письма',
          }
        : {})}
    >
      <View className="flex-row items-center gap-2">
        <Text className="flex-1 font-ui-medium" numberOfLines={1}>
          {row.titleUk}
        </Text>
        {row.status === 'scored' && row.pct !== null ? (
          <Text className={cn('font-ui-bold', band && BAND_TEXT_CLASS[band])}>
            {row.pct.toLocaleString('uk-UA')} %
          </Text>
        ) : (
          <Text variant="caption" testID={`result-${row.kind}-skipped`}>
            {row.status === 'skipped' ? 'пропущено' : 'не складено'}
          </Text>
        )}
      </View>
      <Bar pct={row.pct} band={band} passPct={passPct} />
      <View className="flex-row items-center justify-between">
        <Text variant="caption" className="text-xs" testID={`result-${row.kind}-points`}>
          {row.status === 'scored' && row.points !== null
            ? `${Math.round(row.points * 10) / 10} з ${row.maxPoints} б.`
            : `${row.maxPoints} б.`}
          {row.provisional
            ? pending
              ? ' · попередньо · чекає на оцінку ШІ'
              : failed
                ? ' · попередньо · оцінка ШІ не вдалася'
                : ' · попередньо'
            : ''}
        </Text>
        <View className="flex-row items-center gap-1">
          <Text variant="caption" className="text-xs">
            {used}
            {row.autoSubmitted ? ' · здано за таймером' : ''}
          </Text>
          {onOpen ? <Ionicons name="chevron-forward" size={14} color={tokens.textMuted} /> : null}
        </View>
      </View>
    </Wrap>
  );
}

function Bar({
  pct,
  band,
  passPct,
}: {
  pct: number | null;
  band: ReturnType<typeof bandFor> | null;
  passPct: number;
}) {
  return (
    <View className="h-2 overflow-hidden rounded-full bg-surface-2">
      {pct !== null && (
        <View
          className={cn(
            'absolute bottom-0 left-0 top-0 rounded-full',
            band ? BAND_BAR_CLASS[band] : 'bg-text-muted',
          )}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      )}
      <View
        className="absolute bottom-0 top-0 w-px bg-text-muted"
        style={{ left: `${passPct}%` }}
      />
    </View>
  );
}
