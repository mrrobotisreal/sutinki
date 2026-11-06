import type { Exam } from '@sutinki/schema';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import * as React from 'react';
import { Alert } from 'react-native';

import { repos } from '@/db';
import { invalidateExams } from '@/db/hooks';
import { ExamAttemptActiveError } from '@/db/repositories/exams';
import { drillHref } from '@/features/torfl/drill/drill-model';
import { startMockAttempt } from '@/features/torfl/engine/start';
import { torflLevelOf } from '@/features/torfl/level-profile';
import { practiceRouteFor } from '@/features/torfl/practice-route';
import { ExamIntroScreen, type ExamStartScope } from '@/features/torfl/exam-intro-screen';
import { trackTorfl } from '@/services/analytics';
import { logError } from '@/services/error-log';
import { ukPending } from '@/config/flags';

/**
 * Exam intro route (T69 + T70 drills + T71 mocks). A mock start creates the
 * attempt (single-active rule) and opens the full-screen runner; an existing
 * active attempt offers «Продовжити» / «Почати спочатку» (the latter abandons).
 */
function ExamIntroRoute() {
  const router = useRouter();
  const { packId, examId } = useLocalSearchParams<{ packId: string; examId: string }>();

  const open = React.useCallback(
    (attemptId: string) =>
      router.push({ pathname: '/exam/run/[attemptId]', params: { attemptId } }),
    [router],
  );

  const begin = React.useCallback(
    async (exam: Exam, pack: string, scope: ExamStartScope, replace: boolean) => {
      if (scope.scope === 'drill') return;
      try {
        const attempt = await startMockAttempt(repos.exams, exam, pack, scope, { replace });
        void invalidateExams();
        trackTorfl('exam_started', {
          packId: pack,
          examId: exam.id,
          scope: scope.scope,
          level: torflLevelOf(exam.level),
          ...(scope.scope === 'subtest'
            ? { subtestKind: exam.subtests.find((s) => s.id === scope.subtestId)?.kind ?? 'none' }
            : {}),
        });
        open(attempt.id);
      } catch (err) {
        if (err instanceof ExamAttemptActiveError) {
          Alert.alert(
            'Є незавершена спроба',
            'Спершу заверши її або почни нову — стару буде перервано.',
            [
              { text: 'Отмена', style: 'cancel' },
              { text: 'Продовжити її', onPress: () => open(err.activeAttemptId) },
              {
                text: 'Почати спочатку',
                style: 'destructive',
                onPress: () => void begin(exam, pack, scope, true),
              },
            ],
          );
          return;
        }
        logError('manual', err);
        Alert.alert('Не вдалося почати іспит', 'Спробуй ще раз.');
      }
    },
    [open],
  );

  return (
    <ExamIntroScreen
      packId={packId}
      examId={examId}
      onStartDrill={(exam, pack) => {
        // ISS-004 (T77): speaking / writing-only sets go to their practice surface, not the empty drill runner.
        const route = practiceRouteFor(exam, pack);
        if (route) router.push(route);
        else router.push(drillHref({ source: 'set', packId: pack, examId: exam.id }));
      }}
      onStartMock={(exam, pack, scope) => void begin(exam, pack, scope, false)}
      onResumeMock={open}
      onRestartMock={(exam, pack, scope) => void begin(exam, pack, scope, true)}
    />
  );
}

/** UP04: hidden behind `UK_PENDING.exam` in release builds until UT16/UT17 (docs/SUTINKI_UPSTREAM.md §3). */
export default function GuardedExamIntroRoute() {
  return ukPending('exam') ? <Redirect href="/" /> : <ExamIntroRoute />;
}
