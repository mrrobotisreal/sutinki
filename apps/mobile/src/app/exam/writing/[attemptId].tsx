import { useLocalSearchParams, Redirect } from 'expo-router';

import { WritingReviewScreen } from '@/features/torfl/writing/writing-review-screen';
import { ukPending } from '@/config/flags';

/** Writing review route (T72): `/exam/writing/<attemptId>` — the letter, criteria, corrections, self-check. */
function ExamWritingReviewRoute() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  return <WritingReviewScreen attemptId={attemptId} />;
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT16/UT17 (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedExamWritingReviewRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <ExamWritingReviewRoute />;
}
