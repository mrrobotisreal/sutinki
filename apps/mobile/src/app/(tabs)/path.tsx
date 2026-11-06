import { ukPending } from '@/config/flags';
import { HotelScreen } from '@/features/hotel/hotel-screen';
import { PathPlaceholderScreen } from '@/features/hotel/path-placeholder-screen';

/** UP08: hidden behind `UK_PENDING.hotel` in release builds until UT18. */
export default function PathTab() {
  return ukPending('hotel') ? <PathPlaceholderScreen /> : <HotelScreen />;
}
