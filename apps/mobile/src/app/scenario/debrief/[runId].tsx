import { Redirect } from 'expo-router';

import { ukPending } from '@/config/flags';
import { DebriefScreen } from '@/features/scenario/debrief/debrief-screen';

export default function ScenarioDebriefRoute() {
  if (ukPending('scenarios')) return <Redirect href="/" />;
  return <DebriefScreen />;
}
