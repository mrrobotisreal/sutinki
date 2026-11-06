import { useLocalSearchParams, Redirect } from 'expo-router';

import { TorflHubScreen, type HubOpenedFrom } from '@/features/torfl/hub-screen';
import { ukPending } from '@/config/flags';

const FROM: readonly HubOpenedFrom[] = ['library', 'today', 'deeplink'];

/** `sutinki://torfl` lands here with no `from` → 'deeplink'. */
function TorflHubRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const source = FROM.find((f) => f === from) ?? 'deeplink';
  return <TorflHubScreen from={source} />;
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT16/UT17 (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedTorflHubRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <TorflHubRoute />;
}
