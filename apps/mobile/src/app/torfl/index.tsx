import { useLocalSearchParams, Redirect } from 'expo-router';

import { TorflHubScreen, type HubOpenedFrom } from '@/features/torfl/hub-screen';
import { ukPending } from '@/config/flags';
import { levelFromParam } from '@/features/torfl/level-profile';

const FROM: readonly HubOpenedFrom[] = ['library', 'today', 'deeplink'];

/**
 * `sutinki://torfl` lands here with no `from` → 'deeplink'. `?level=A2` opens the
 * A2 hub; no param (or an unknown one) → A1 (back-compat).
 */
function TorflHubRoute() {
  const { from, level } = useLocalSearchParams<{ from?: string; level?: string | string[] }>();
  const source = FROM.find((f) => f === from) ?? 'deeplink';
  return <TorflHubScreen from={source} level={levelFromParam(level)} />;
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT16/UT17 (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedTorflHubRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <TorflHubRoute />;
}
