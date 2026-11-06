import { WritingPracticeScreen } from '@/features/torfl/writing/writing-practice-screen';
import { Redirect } from 'expo-router';
import { ukPending } from '@/config/flags';

/** `/torfl/writing?packId&examId&itemId` — untimed writing practice (T72). */
function TorflWritingRoute() {
  return <WritingPracticeScreen />;
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT16/UT17 (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedTorflWritingRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <TorflWritingRoute />;
}
