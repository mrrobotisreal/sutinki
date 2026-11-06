import { ExamRunScreen } from '@/features/torfl/exam-run-screen';
import { Redirect } from 'expo-router';
import { ukPending } from '@/config/flags';

/** Mock runner route (T71): `/exam/run/<attemptId>[?devDurationSec=60]` (the override is __DEV__ only). */
function ExamRunRoute() {
  return <ExamRunScreen />;
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT16/UT17 (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedExamRunRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <ExamRunRoute />;
}
