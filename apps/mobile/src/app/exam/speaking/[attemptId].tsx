import { useLocalSearchParams, Redirect } from 'expo-router';

import { SpeakingDebriefScreen } from '@/features/torfl/speaking/speaking-debrief-screen';
import { ukPending } from '@/config/flags';

/** Speaking debrief route (T73): `/exam/speaking/<attemptId>` — recordings, transcripts, criteria, model answers. */
function ExamSpeakingDebriefRoute() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  return <SpeakingDebriefScreen attemptId={attemptId} />;
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT16/UT17 (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedExamSpeakingDebriefRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <ExamSpeakingDebriefRoute />;
}
