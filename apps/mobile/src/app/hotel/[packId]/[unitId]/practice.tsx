import { useLocalSearchParams, Redirect } from 'expo-router';

import { ukPending } from '@/config/flags';
import { RunnerScreen } from '@/features/hotel/runner/runner-screen';

/** A unit's scored exercises (T90 unit mode): feedback after every answer. */
function HotelPracticeRoute() {
  const { packId, unitId } = useLocalSearchParams<{ packId: string; unitId: string }>();
  return <RunnerScreen packId={packId} unitId={unitId} mode="unit" />;
}

/** UP08: hidden behind `UK_PENDING.hotel` in release builds until UT18. */
export default function GuardedRoute() {
  return ukPending('hotel') ? <Redirect href="/" /> : <HotelPracticeRoute />;
}
