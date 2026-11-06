import { useLocalSearchParams, Redirect } from 'expo-router';

import { ukPending } from '@/config/flags';
import { RunnerScreen } from '@/features/hotel/runner/runner-screen';

/**
 * A floor exam (`mode=floor`) or экстерн (`mode=extern`) under exam conditions
 * (T90 decision 5). Anything else falls back to the floor exam.
 */
function HotelExamRoute() {
  const { packId, mode } = useLocalSearchParams<{ packId: string; mode?: string }>();
  return <RunnerScreen packId={packId} mode={mode === 'extern' ? 'extern' : 'floor'} />;
}

/** UP08: hidden behind `UK_PENDING.hotel` in release builds until UT18. */
export default function GuardedRoute() {
  return ukPending('hotel') ? <Redirect href="/" /> : <HotelExamRoute />;
}
