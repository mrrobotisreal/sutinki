import { Redirect, useLocalSearchParams } from 'expo-router';

import { ukPending } from '@/config/flags';
/**
 * `sutinki://hotel?floor=N` (T92 decision 11): the hotel is the Путь tab, so the
 * deep link forwards to it with the floor. Without `floor` it opens the tab on
 * the saved floor (`hotel.lastFloor`).
 */
function HotelIndexRoute() {
  const { floor } = useLocalSearchParams<{ floor?: string }>();
  const params = floor !== undefined ? { floor } : undefined;
  return <Redirect href={{ pathname: '/(tabs)/path', params } as never} />;
}

/** UP08: hidden behind `UK_PENDING.hotel` in release builds until UT18. */
export default function GuardedRoute() {
  return ukPending('hotel') ? <Redirect href="/" /> : <HotelIndexRoute />;
}
