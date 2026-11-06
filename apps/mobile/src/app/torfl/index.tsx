import { useLocalSearchParams, Redirect } from 'expo-router';

import { TorflHubScreen, type HubOpenedFrom } from '@/features/torfl/hub-screen';
import { ukPending } from '@/config/flags';
import { levelParamOrNull } from '@/features/torfl/level-profile';

const FROM: readonly HubOpenedFrom[] = ['library', 'today', 'deeplink'];

/**
 * `sutinki://torfl` lands here with no `from` → 'deeplink'. `?level=B1` opens the
 * B1 hub; no (or an unknown) param → the last used level, else the lowest level with a pack, else B1.
 */
function TorflHubRoute() {
  const { from, level } = useLocalSearchParams<{ from?: string; level?: string | string[] }>();
  const source = FROM.find((f) => f === from) ?? 'deeplink';
  return <TorflHubScreen from={source} level={levelParamOrNull(level) ?? undefined} />;
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT17 flips it (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedTorflHubRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <TorflHubRoute />;
}
