import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';
import { useAppTheme } from '@/theme/use-app-theme';

import { pluralUk } from '@/lib/uk-plural';

import { MODE_LABELS, bestLabel, formatMinutes, type ExamListItem } from './hub-model';
import { MODELLED_BADGE } from './level-profile';
import { SUBTEST_LABELS } from './topics';

const ITEMS = ['завдання', 'завдання', 'завдань'] as const;

/**
 * One exam as a row (T69, UT16b) — the Library «Іспит» shelf and
 * the hub's «Пробні іспити» list share it. Title, a mode badge
 * («Пробний іспит» accent-washed / «Тренування» neutral), one chip per
 * section, the best result or «не пройдено»; tap → the exam's intro.
 */
export function ExamRow({ item, onPress }: { item: ExamListItem; onPress: () => void }) {
  const { tokens } = useAppTheme();
  const mock = item.mode === 'mock';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${MODE_LABELS[item.mode]}: ${item.titleUk}. ${bestLabel(item.best)}`}
      testID={`exam-row-${item.examId}`}
      className="mb-2 gap-2 rounded-xl border border-border bg-surface px-4 py-3.5 active:bg-surface-2"
    >
      <View className="flex-row items-center gap-2">
        <View className={cn('rounded-full px-2 py-0.5', mock ? 'bg-accent-soft' : 'bg-surface-2')}>
          <Text className={cn('font-ui-medium text-xs', mock ? 'text-accent' : 'text-text-muted')}>
            {MODE_LABELS[item.mode]}
          </Text>
        </View>
        {item.modelled && (
          <View className="rounded-full border border-border px-2 py-0.5">
            <Text variant="caption" className="text-xs">
              {MODELLED_BADGE}
            </Text>
          </View>
        )}
        <Text variant="caption" className="flex-1" numberOfLines={1}>
          {item.itemCount} {pluralUk(item.itemCount, ITEMS)} · {formatMinutes(item.totalMin)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={tokens.textMuted} />
      </View>
      <Text className="font-reading text-base" numberOfLines={2}>
        {item.titleUk}
      </Text>
      <View className="flex-row flex-wrap items-center gap-1.5">
        {item.subtestKinds.map((kind, i) => (
          <View
            key={`${kind}-${i}`}
            className="flex-row items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5"
          >
            <Ionicons name={SUBTEST_LABELS[kind].icon} size={11} color={tokens.textMuted} />
            <Text variant="caption" className="text-xs">
              {SUBTEST_LABELS[kind].short}
            </Text>
          </View>
        ))}
        <Text
          variant="caption"
          className={cn('ml-auto', item.best?.verdict === 'pass' && 'text-success')}
        >
          {bestLabel(item.best)}
        </Text>
      </View>
    </Pressable>
  );
}
