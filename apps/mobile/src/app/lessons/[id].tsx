import { Redirect, useLocalSearchParams } from 'expo-router';

import { ukPending } from '@/config/flags';
import { LessonScreen } from '@/features/word-forms/lesson-screen';

/** One saved grammar lesson (M16/T54, WORD_FORMS §7.3). */
export default function LessonRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (ukPending('wordProfiles')) return <Redirect href="/" />;
  return <LessonScreen id={id} />;
}
