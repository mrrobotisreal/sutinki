import { TicketsScreen } from '@/features/torfl/speaking/tickets-screen';
import { Redirect } from 'expo-router';
import { ukPending } from '@/config/flags';

/** `/torfl/tickets` — «Билеты»: draw a random monologue topic and run the task-3 flow (T73). */
function TorflTicketsRoute() {
  return <TicketsScreen />;
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT16/UT17 (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedTorflTicketsRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <TorflTicketsRoute />;
}
