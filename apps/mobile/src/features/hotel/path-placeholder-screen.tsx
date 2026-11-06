import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useAppTheme } from '@/theme/use-app-theme';

/**
 * UP08: the Path tab while `UK_PENDING.hotel` is on (release builds). The hotel engine is merged but
 * its Ukrainian ladder is UT18's work — nothing of the Sumrak hotel (art, TORFL gate) may show.
 * Static copy: no query, so no loading/error state exists; the empty state IS the screen.
 */
export function PathPlaceholderScreen() {
  const { tokens } = useAppTheme();
  return (
    <View
      className="flex-1 items-center justify-center gap-3 bg-bg px-10"
      testID="path-placeholder"
    >
      <Ionicons name="business-outline" size={40} color={tokens.textMuted} />
      <Text className="font-reading-bold text-xl">Шлях</Text>
      <Text variant="muted" className="text-center">
        Готель «Сутінки» відкриється згодом.
      </Text>
    </View>
  );
}
