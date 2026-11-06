import { useLocalSearchParams, Redirect } from 'expo-router';

import { ukPending } from '@/config/flags';
import { LessonScreen } from '@/features/hotel/lesson/lesson-screen';

/** A hotel unit's lesson (T90): the paged cards, resume, the finale. */
function HotelLessonRoute() {
  const { packId, unitId } = useLocalSearchParams<{ packId: string; unitId: string }>();
  return <LessonScreen packId={packId} unitId={unitId} />;
}

/** UP08: hidden behind `UK_PENDING.hotel` in release builds until UT18. */
export default function GuardedRoute() {
  return ukPending('hotel') ? <Redirect href="/" /> : <HotelLessonRoute />;
}
