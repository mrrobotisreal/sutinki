import { DrillScreen } from '@/features/torfl/drill/drill-screen';
import { Redirect } from 'expo-router';
import { ukPending } from '@/config/flags';

/** `/torfl/drill?packId&examId&topic?&source=set|deck|lightning` (T70). */
function TorflDrillRoute() {
  return <DrillScreen />;
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT16/UT17 (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedTorflDrillRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <TorflDrillRoute />;
}
