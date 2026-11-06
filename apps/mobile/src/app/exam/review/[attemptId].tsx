import { useLocalSearchParams, Redirect } from 'expo-router';

import { ExamReviewScreen } from '@/features/torfl/exam-review-screen';
import { ukPending } from '@/config/flags';

/** Mock item review route (T71): `/exam/review/<attemptId>` (only after the attempt is finished). */
function ExamReviewRoute() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  return <ExamReviewScreen attemptId={attemptId} />;
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT16/UT17 (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedExamReviewRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <ExamReviewRoute />;
}
