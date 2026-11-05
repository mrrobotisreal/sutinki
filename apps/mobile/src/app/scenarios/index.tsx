import { Redirect } from 'expo-router';

import { ukPending } from '@/config/flags';
import { ScenariosHubScreen } from '@/features/scenario/scenarios-hub-screen';

export default function ScenariosRoute() {
  if (ukPending('scenarios')) return <Redirect href="/" />;
  return <ScenariosHubScreen />;
}
