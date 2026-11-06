import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import { Alert, Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { repos } from '@/db';
import { invalidateExams } from '@/db/hooks';
import { cn } from '@/lib/cn';
import { useAppTheme } from '@/theme/use-app-theme';

import { lightningPaceNote } from '../level-profile';
import { lightningPaceSec } from '../pace';
import { SUBTEST_LABELS } from '../topics';
import type { DrillOutcome } from './use-drill-session';

function mmss(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Drill summary (T70, UT16b): accuracy, XP, time, the per-topic table,
 * «до колоди помилок: N», the answered items (LONG-PRESS an item → suspend its
 * deck card), a «практика — у розділі Письмо/Говоріння» row for skipped
 * rubric items, and — for the quick round — the pace readout.
 */
export function DrillSummary({ outcome, onDone }: { outcome: DrillOutcome; onDone: () => void }) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { summary, results, skipped, xp, avgSec, source } = outcome;
  const [suspended, setSuspended] = React.useState<ReadonlySet<string>>(new Set());
  const lightning = source === 'lightning';
  const onPace = avgSec <= lightningPaceSec(outcome.level);

  const suspend = (itemKey: string) => {
    Alert.alert('Прибрати з колоди?', 'Картка перестане повертатися (можна повернути пізніше).', [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Прибрати',
        style: 'destructive',
        onPress: () => {
          void repos.exams
            .suspendCard(itemKey)
            .then(() => {
              setSuspended((s) => new Set(s).add(itemKey));
              void invalidateExams();
            })
            .catch((err) => console.warn('[drill] suspend failed', err));
        },
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="gap-6 px-4 pt-6"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      <View className="items-center gap-1" testID="drill-summary">
        <Text variant="caption" className="uppercase tracking-wider">
          {lightning
            ? 'Швидкий раунд · готово'
            : source === 'deck'
              ? 'Робота над помилками · готово'
              : 'Тренування завершено'}
        </Text>
        <RNText className="font-ui-bold text-6xl text-text" testID="drill-accuracy">
          {summary.accuracyPct}%
        </RNText>
        <Text variant="muted">
          Правильно {summary.correct} з {summary.answered}
          {summary.half > 0 ? ` · майже ${summary.half}` : ''}
        </Text>
      </View>

      <View className="flex-row justify-center gap-8">
        <Stat value={mmss(summary.totalMs)} label="час" />
        <Stat value={`+${xp}`} label="XP" accent />
        <Stat value={String(summary.toDeck)} label="до колоди помилок" testID="drill-to-deck" />
      </View>

      {lightning && (
        <View
          className={cn(
            'gap-1 rounded-xl border px-4 py-3',
            onPace ? 'border-success bg-success/15' : 'border-border bg-surface',
          )}
          testID="lightning-pace"
        >
          <Text className="font-ui-bold">
            Твій темп: {avgSec.toLocaleString('uk-UA')} с на завдання
          </Text>
          <Text variant="caption">
            {lightningPaceNote(outcome.level)}{' '}
            {onPace ? 'Ти вкладаєшся!' : 'Треба швидше — частіше тренуй швидкий раунд.'}
          </Text>
        </View>
      )}

      {summary.perTopic.length > 0 && (
        <View className="gap-2">
          <Text variant="caption" className="px-1 font-ui-medium uppercase tracking-wider">
            За темами
          </Text>
          <View className="overflow-hidden rounded-xl border border-border bg-surface">
            {summary.perTopic.map((t, i) => (
              <View
                key={t.topic}
                className={cn(
                  'flex-row items-center gap-3 px-4 py-3',
                  i > 0 && 'border-t border-border',
                )}
                testID={`topic-row-${t.topic}`}
              >
                <Text className="flex-1 font-ui-medium">{t.uk}</Text>
                <Text variant="caption">
                  {t.correct}/{t.answered}
                </Text>
                <Text
                  className={cn(
                    'w-12 text-right font-ui-bold',
                    t.pct >= 66 ? 'text-success' : t.pct >= 60 ? 'text-track-warm' : 'text-danger',
                  )}
                >
                  {t.pct}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className="gap-2">
        <Text variant="caption" className="px-1 font-ui-medium uppercase tracking-wider">
          Завдання · довге натискання — прибрати з колоди
        </Text>
        <View className="overflow-hidden rounded-xl border border-border bg-surface">
          {results.map((r, i) => {
            const off = suspended.has(r.itemKey);
            const icon =
              r.outcome === 'full'
                ? 'checkmark-circle'
                : r.outcome === 'half'
                  ? 'remove-circle'
                  : 'close-circle';
            const color =
              r.outcome === 'full'
                ? tokens.success
                : r.outcome === 'half'
                  ? tokens.trackWarm
                  : tokens.danger;
            return (
              <Pressable
                key={r.itemKey}
                onLongPress={() => suspend(r.itemKey)}
                delayLongPress={350}
                accessibilityRole="button"
                accessibilityHint="Long press to suspend this card"
                testID={`result-row-${r.itemId}`}
                className={cn(
                  'flex-row items-center gap-3 px-4 py-3 active:bg-surface-2',
                  i > 0 && 'border-t border-border',
                  off && 'opacity-40',
                )}
              >
                <Ionicons name={icon} size={18} color={color} />
                <Text className="flex-1 text-sm" numberOfLines={1}>
                  {r.label ?? r.itemId}
                </Text>
                {off && <Text variant="caption">прибрано</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>

      {(skipped.writing > 0 || skipped.speaking > 0) && (
        <View className="flex-row items-start gap-3 rounded-xl border border-dashed border-border px-4 py-3">
          <Ionicons name="information-circle-outline" size={18} color={tokens.textMuted} />
          <Text variant="muted" className="flex-1 text-sm">
            Завдання з{' '}
            {[
              skipped.writing > 0 ? SUBTEST_LABELS.writing.uk : null,
              skipped.speaking > 0 ? SUBTEST_LABELS.speaking.uk : null,
            ]
              .filter(Boolean)
              .join(' і ')}{' '}
            пропущено: практика — у розділі «Письмо» / «Говоріння».
          </Text>
        </View>
      )}

      <Pressable
        onPress={onDone}
        accessibilityRole="button"
        testID="drill-done"
        className="items-center rounded-xl bg-accent py-4 active:opacity-80"
      >
        <Text className="font-ui-medium text-bg">Готово</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({
  value,
  label,
  accent = false,
  testID,
}: {
  value: string;
  label: string;
  accent?: boolean;
  testID?: string;
}) {
  return (
    <View className="items-center" testID={testID}>
      <Text className={cn('font-ui-bold text-xl', accent && 'text-accent')}>{value}</Text>
      <Text variant="caption" className="text-center text-xs">
        {label}
      </Text>
    </View>
  );
}
