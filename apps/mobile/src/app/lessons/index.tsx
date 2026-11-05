import { Redirect } from 'expo-router';

import { ukPending } from '@/config/flags';
import { LessonsScreen } from '@/features/word-forms/lessons-screen';

/** Global Lessons list (M16/T54, WORD_FORMS §7.3) — reached from the Словарь header. */
export default function LessonsRoute() {
  if (ukPending('wordProfiles')) return <Redirect href="/" />;
  return <LessonsScreen />;
}
