import { useLocalSearchParams } from 'expo-router';

import { TorflHubScreen, type HubOpenedFrom } from '@/features/torfl/hub-screen';
import { levelParamOrNull } from '@/features/torfl/level-profile';

const FROM: readonly HubOpenedFrom[] = ['library', 'today', 'deeplink'];

/**
 * `sutinki://torfl` lands here with no `from` → 'deeplink'. `?level=B1` opens the
 * B1 hub; no (or an unknown) param → the last used level, else the lowest level with a pack, else B1.
 */
export default function TorflHubRoute() {
  const { from, level } = useLocalSearchParams<{ from?: string; level?: string | string[] }>();
  const source = FROM.find((f) => f === from) ?? 'deeplink';
  return <TorflHubScreen from={source} level={levelParamOrNull(level) ?? undefined} />;
}
