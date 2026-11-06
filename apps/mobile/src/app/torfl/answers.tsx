import { AnswersScreen } from '@/features/torfl/answers/answers-screen';
import { Redirect } from 'expo-router';
import { ukPending } from '@/config/flags';

/** `/torfl/answers` — «Мои ответы», the personal answer bank (T74, TORFL §9). */
function TorflAnswersRoute() {
  return <AnswersScreen />;
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT16/UT17 (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedTorflAnswersRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <TorflAnswersRoute />;
}
