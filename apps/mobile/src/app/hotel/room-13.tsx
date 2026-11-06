import { Redirect } from 'expo-router';

import { ukPending } from '@/config/flags';
import Room13Screen from '@/features/hotel/room-13';

/** Номер 13 (T92c D6): the gate room behind the drop. The mock itself opens from «Войти». */

/** UP08: hidden behind `UK_PENDING.hotel` in release builds until UT18. */
export default function GuardedRoute() {
  return ukPending('hotel') ? <Redirect href="/" /> : <Room13Screen />;
}
