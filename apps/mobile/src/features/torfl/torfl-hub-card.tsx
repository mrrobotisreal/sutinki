import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useAppTheme } from '@/theme/use-app-theme';

import { countdownLabel, placeholderReadiness, type ReadinessView } from './hub-model';
import { useExamDate, useTorflToday } from './hooks';
import { profileFor, hubCardTitle, type TorflLevel } from './level-profile';
import { ReadinessBars } from './readiness-bars';

/**
 * The pinned hub card at the top of each Library «Іспит» shelf (T69, UT16b) —
 * one card per level chip, parameterised by level. Countdown from the level's
 * exam-date key, one readiness mini-bar per section of the level, tap →
 * `/torfl?level=`.
 */
export function TorflHubCard({
  level = 'A1',
  readiness,
}: {
  level?: TorflLevel;
  readiness?: readonly ReadinessView[];
}) {
  const router = useRouter();
  const { tokens } = useAppTheme();
  const { date, today } = useExamDate(level);
  const today_ = useTorflToday(level);
  const rows = readiness ?? (today_.isPending ? placeholderReadiness(level) : today_.readiness);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/torfl', params: { from: 'library', level } })}
      accessibilityRole="button"
      accessibilityLabel={`${profileFor(level).chipLabel}. ${countdownLabel(date, today)}. Відкрити підготовку до іспиту`}
      testID={level === 'A1' ? 'torfl-hub-card' : `torfl-hub-card-${level.toLowerCase()}`}
      className="gap-3 rounded-2xl border border-accent/40 bg-surface px-4 py-4 active:bg-surface-2"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
          <Ionicons name="ribbon-outline" size={20} color={tokens.accent} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="font-ui-bold text-base">{hubCardTitle(level)}</Text>
          <Text variant="caption" className={date ? 'text-accent' : undefined}>
            {countdownLabel(date, today)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={tokens.textMuted} />
      </View>
      <ReadinessBars rows={rows} compact passPct={profileFor(level).passPct} />
    </Pressable>
  );
}
