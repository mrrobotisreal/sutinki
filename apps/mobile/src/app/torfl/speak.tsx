import { SpeakingPracticeScreen } from '@/features/torfl/speaking/speaking-practice-screen';
import { Redirect } from 'expo-router';
import { ukPending } from '@/config/flags';

/** `/torfl/speak?packId&examId&itemId` — untimed task-1 / task-2 speaking practice (T73). */
function TorflSpeakRoute() {
  return <SpeakingPracticeScreen />;
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT16/UT17 (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedTorflSpeakRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <TorflSpeakRoute />;
}
