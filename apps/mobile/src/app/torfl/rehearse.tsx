import { RehearseScreen } from '@/features/torfl/answers/rehearse-screen';
import { Redirect } from 'expo-router';
import { ukPending } from '@/config/flags';

/** `/torfl/rehearse?entryId&topic` — rehearse one journal answer aloud, with text then without (T74). */
function TorflRehearseRoute() {
  return <RehearseScreen />;
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT16/UT17 (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedTorflRehearseRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <TorflRehearseRoute />;
}
