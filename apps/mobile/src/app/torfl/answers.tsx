import { useLocalSearchParams } from 'expo-router';

import { levelFromParam } from '@/features/torfl/level-profile';
import { AnswersScreen } from '@/features/torfl/answers/answers-screen';
import { Redirect } from 'expo-router';
import { ukPending } from '@/config/flags';

/** `/torfl/answers` — «Мои ответы», the personal answer bank (T74, TORFL §9); `?level=` per level (T75). */
function TorflAnswersRoute() {
  const { level } = useLocalSearchParams<{ level?: string | string[] }>();
  return <AnswersScreen level={levelFromParam(level)} />;
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT16/UT17 (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedTorflAnswersRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <TorflAnswersRoute />;
}
