import { TorflTextsScreen } from '@/features/torfl/texts-screen';
import { Redirect } from 'expo-router';
import { ukPending } from '@/config/flags';

function TorflTextsRoute() {
  return <TorflTextsScreen />;
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT16/UT17 (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedTorflTextsRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <TorflTextsRoute />;
}
