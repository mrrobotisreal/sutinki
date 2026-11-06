import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { Exam, WritingItem } from '@sutinki/schema';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QueryError } from '@/components/query-error';
import { Text } from '@/components/ui/text';
import { useExam, useExamAttempt } from '@/db/hooks';
import { FeedbackView } from '@/features/ai/feedback-view';
import { AiError, friendlyAiMessage } from '@/features/ai/errors';
import { cn } from '@/lib/cn';
import { trackTorfl } from '@/services/analytics';
import { useAppTheme } from '@/theme/use-app-theme';

import { applySelfCheck } from '../grading/self-check';
import { requestGrading, storyText, useGradingQueue } from '../grading/queue';
import { criterionLabel, writingKindOf } from '../grading/writing';
import { torflLevelOf } from '../level-profile';
import type { ExamResponse } from '@/db/repositories/exams';
import { mergedCriteria } from './review-model';
import { SelfCheckSheet } from './self-check-sheet';
import { isNoteTopic, writingItemsOf, writingTaskOf } from './writing-model';

const LITERATA = { fontFamily: 'Literata_400Regular', fontSize: 17, lineHeight: 28 } as const;

/**
 * The writing review (T72, TORFL §6.2 / §8.3) — route
 * `/exam/writing/[attemptId]`: the letter, the five-criterion table with
 * the grader's comments (offline rows marked провизорно until AI / self),
 * the corrected text as the journal's inline diff (`FeedbackView`), the
 * tips, «Повторити оцінку» on `ai-failed` / `provisional`, «Самоперевірка»,
 * and the model letter («Тексти» → the reader). Subscribes to the grading
 * queue so an AI grade landing re-renders in place.
 */
export function WritingReviewScreen({ attemptId }: { attemptId: string }) {
  const { tokens } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const gradedVersion = useGradingQueue((s) => s.gradedVersion);
  const sending = useGradingQueue((s) => s.sending);
  const attempt = useExamAttempt(attemptId);
  const exam = useExam(attempt.data?.packId, attempt.data?.examId);
  React.useEffect(() => {
    if (gradedVersion > 0) void attempt.refetch();
    // refetch when a grade lands
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradedVersion]);

  const a = attempt.data;
  const e = exam.data;
  const writingSubtest = e?.subtests.find((s) => s.kind === 'writing');
  // T76: every writing task, in exam order (A1: one letter; A2: letter + note).
  const tasks = React.useMemo(() => {
    if (!e || !a || !writingSubtest) return [];
    return writingItemsOf(writingSubtest).flatMap((item, i) => {
      const response = a.responses.find(
        (r) => r.subtestId === writingSubtest.id && r.itemId === item.id,
      );
      return response ? [{ item, response, task: i + 1 }] : [];
    });
  }, [e, a, writingSubtest]);

  if (attempt.isPending || (a && exam.isPending)) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }
  if (!a || !e || !writingSubtest || tasks.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-bg px-8">
        <QueryError message="Текст не знайдено." onRetry={() => router.back()} />
      </View>
    );
  }

  const multi = tasks.length > 1;
  const pct = a.results?.[writingSubtest.id]?.pct ?? null;
  const gradedBy = a.results?.[writingSubtest.id]?.gradedBy ?? 'offline';
  const provisional = a.results?.[writingSubtest.id]?.provisional ?? true;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 4 }} testID="writing-review">
      <View className="flex-row items-center gap-3 px-3 pb-2">
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
          <Text className="font-reading-bold text-xl">Письмо · розбір</Text>
          <Text variant="caption" testID="writing-review-total">
            {pct !== null ? `${pct.toLocaleString('uk-UA')} %` : '—'}
            {provisional
              ? ' · попередньо'
              : gradedBy === 'ai'
                ? ' · оцінка ШІ'
                : ' · самоперевірка'}
          </Text>
        </View>
      </View>
      <ScrollView
        contentContainerClassName="gap-8 px-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {tasks.map((t) => (
          <TaskReview
            key={t.item.id}
            exam={e}
            packId={a.packId}
            item={t.item}
            response={t.response}
            task={t.task}
            multi={multi}
            sending={sending}
            onChanged={() => void attempt.refetch()}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/** One writing task of the review (T76): status + actions, criteria, text / corrections, model. */
function TaskReview({
  exam: e,
  packId,
  item,
  response,
  task,
  multi,
  sending,
  onChanged,
}: {
  exam: Exam;
  packId: string;
  item: WritingItem;
  response: ExamResponse;
  task: number;
  multi: boolean;
  sending: Record<string, boolean>;
  onChanged: () => void;
}) {
  const { tokens } = useAppTheme();
  const router = useRouter();
  const [selfOpen, setSelfOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const model = useQuery({
    queryKey: ['torfl', 'model-letter', packId, item.model?.storyId ?? ''],
    queryFn: () => storyText(packId, item.model!.storyId, item.model!.sentenceIds),
    enabled: !!item.model,
  });

  const letter = response.answer?.kind === 'writing' ? response.answer.text : '';
  const g = response.grading;
  const status = response.gradingStatus;
  // In flight = the pump is sending it now; a `pending-ai` row with no sender is WAITING (offline / no key).
  const inFlight = sending[response.id] === true;
  const waiting = status === 'pending-ai' && !inFlight;
  const kind = writingKindOf(item);
  const criteria = mergedCriteria(response, kind);
  const isNote = isNoteTopic(item.topic);
  const noun = isNote ? 'повідомлення' : 'текст';

  const retry = async () => {
    setBusy('retry');
    setError(null);
    try {
      const ok = await requestGrading(response.id);
      if (!ok)
        setError(
          isNote
            ? 'Повідомлення порожнє — оцінювати нічого.'
            : 'Текст порожній — оцінювати нічого.',
        );
    } catch (err) {
      setError(
        friendlyAiMessage(err instanceof AiError ? err : new AiError('unknown', String(err))),
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="gap-5" testID={`writing-task-${task}`}>
      {multi && (
        <Text className="font-reading-bold text-lg" testID={`writing-task-${task}-title`}>
          Завдання {task} · {isNote ? 'повідомлення' : 'текст'}
        </Text>
      )}
      {/* status / actions */}
      <View
        className="gap-2 rounded-2xl border border-border bg-surface px-4 py-3"
        testID="writing-status"
      >
        {inFlight ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color={tokens.accent} />
            <Text variant="muted">ШІ оцінює {noun}…</Text>
          </View>
        ) : waiting ? (
          <Text variant="muted" testID="writing-waiting">
            Очікує мережі: ШІ оцінить {noun}, коли з’явиться інтернет. Поки що — попередня оцінка.
          </Text>
        ) : status === 'ai-failed' ? (
          <>
            <Text className="font-ui-medium text-danger" testID="writing-ai-failed">
              Оцінка ШІ не вдалася{g?.error ? ` (${g.error.code})` : ''}.
            </Text>
            <Text variant="caption">
              Попередня оцінка залишилась. Повтори, коли буде зв’язок і ключ.
            </Text>
          </>
        ) : status === 'provisional' ? (
          <Text variant="muted">
            Оцінено лише критерії, які можна перевірити офлайн (результат перераховано у %).
          </Text>
        ) : status === 'self-graded' ? (
          <Text variant="muted">Оцінка за самоперевіркою — остаточна.</Text>
        ) : (
          <Text variant="muted">
            Оцінено ШІ
            {g?.ai?.model ? ` · ${g.ai.model.replace(/^(anthropic|openai)\//, '')}` : ''}
            {g?.ai?.costUsd !== undefined ? ` · $${g.ai.costUsd.toFixed(3)}` : ''}
          </Text>
        )}
        {(status === 'ai-failed' || status === 'provisional' || waiting) && !inFlight && (
          <View className="mt-1 flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => void retry()}
              disabled={busy !== null}
              accessibilityRole="button"
              testID="writing-retry"
              className="flex-row items-center gap-1.5 rounded-full bg-accent px-4 py-2 active:opacity-80"
            >
              <Ionicons name="refresh" size={14} color={tokens.bg} />
              <Text className="font-ui-medium text-sm text-bg">Повторити оцінку</Text>
            </Pressable>
            <Pressable
              onPress={() => setSelfOpen(true)}
              disabled={busy !== null}
              accessibilityRole="button"
              testID="writing-self-check"
              className="flex-row items-center gap-1.5 rounded-full border border-accent px-4 py-2 active:bg-accent-soft"
            >
              <Ionicons name="checkbox-outline" size={14} color={tokens.accent} />
              <Text className="font-ui-medium text-sm text-accent">Самоперевірка</Text>
            </Pressable>
          </View>
        )}
        {error && (
          <Text variant="caption" className="text-danger">
            {error}
          </Text>
        )}
      </View>

      {/* criteria */}
      <View className="gap-2">
        <SectionTitle>Критерії</SectionTitle>
        <View className="overflow-hidden rounded-2xl border border-border bg-surface">
          {criteria.map((c, i) => (
            <View
              key={c.id}
              className={cn('gap-1 px-4 py-3', i > 0 && 'border-t border-border')}
              testID={`criterion-${c.id}`}
            >
              <View className="flex-row items-center gap-2">
                <Text className="flex-1 font-ui-medium">{criterionLabel(c.id, item.topic).uk}</Text>
                <Text className={cn('font-ui-bold', c.pending && 'text-text-muted')}>
                  {c.pending ? '—' : c.score.toLocaleString('uk-UA')} / {c.max}
                </Text>
              </View>
              <Text variant="caption">
                {criterionLabel(c.id, item.topic).en}
                {c.source === 'offline'
                  ? ' · офлайн'
                  : c.source === 'self'
                    ? ' · самоперевірка'
                    : ''}
              </Text>
              {c.comment ? <Text className="text-sm leading-5">{c.comment}</Text> : null}
            </View>
          ))}
        </View>
      </View>

      {/* the letter / corrections */}
      <View className="gap-2">
        <SectionTitle>{g?.ai?.corrected ? 'Виправлення' : 'Твій текст'}</SectionTitle>
        {g?.ai?.corrected ? (
          <FeedbackView
            feedback={{
              v: 1,
              sourceUk: letter,
              corrected: g.ai.corrected,
              changes: g.ai.changes ?? [],
              summary: g.ai.tips.length > 0 ? g.ai.tips.join(' ') : 'No tips.',
              model: g.ai.model ?? 'exam-grader',
              createdAt: g.ai.gradedAt ?? response.updatedAt,
            }}
          />
        ) : (
          <View className="rounded-2xl border border-border bg-surface px-4 py-4">
            <RNText style={{ ...LITERATA, color: tokens.text }}>{letter || '—'}</RNText>
          </View>
        )}
      </View>

      {/* model letter */}
      {item.model && (
        <View className="gap-2">
          <SectionTitle>Зразок</SectionTitle>
          <Pressable
            onPress={() => {
              trackTorfl('torfl_text_opened', {
                packId: packId,
                storyId: item.model!.storyId,
                from: 'review',
                level: torflLevelOf(e?.level),
              });
              router.push({
                pathname: '/reader/[packId]/[storyId]',
                params: { packId: packId, storyId: item.model!.storyId, from: 'torfl' },
              });
            }}
            accessibilityRole="button"
            testID="writing-model-letter"
            className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 active:bg-surface-2"
          >
            <Ionicons name="reader-outline" size={18} color={tokens.accent} />
            <View className="flex-1">
              <Text className="font-ui-medium">Зразок тексту</Text>
              <Text variant="caption" numberOfLines={2}>
                {model.data ?? 'Відкрити в читалці'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={tokens.textMuted} />
          </Pressable>
        </View>
      )}

      <SelfCheckSheet
        open={selfOpen}
        kind={kind}
        letter={letter}
        modelLetter={model.data ?? null}
        onClose={() => setSelfOpen(false)}
        onSubmit={(answers) => {
          setSelfOpen(false);
          setBusy('self');
          void applySelfCheck(
            response,
            answers,
            torflLevelOf(e.level),
            writingTaskOf(e, response.subtestId, response.itemId),
          )
            .then(() => onChanged())
            .catch((err) => setError(String(err)))
            .finally(() => setBusy(null));
        }}
      />
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="caption" className="px-1 font-ui-medium uppercase tracking-wider">
      {children}
    </Text>
  );
}
