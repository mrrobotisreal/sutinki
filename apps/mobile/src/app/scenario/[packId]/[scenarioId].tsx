import { Redirect } from 'expo-router';

import { ukPending } from '@/config/flags';
import { ScenarioRunScreen } from '@/features/scenario/scenario-run-screen';

export default function ScenarioRunRoute() {
  if (ukPending('scenarios')) return <Redirect href="/" />;
  return <ScenarioRunScreen />;
}
