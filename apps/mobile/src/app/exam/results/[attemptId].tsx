import { useLocalSearchParams, Redirect } from 'expo-router';

import { ExamResultsScreen } from '@/features/torfl/exam-results-screen';
import { ukPending } from '@/config/flags';

/** Mock results route (T71): `/exam/results/<attemptId>`. */
function ExamResultsRoute() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  return <ExamResultsScreen attemptId={attemptId} />;
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT16/UT17 (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedExamResultsRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <ExamResultsRoute />;
}
