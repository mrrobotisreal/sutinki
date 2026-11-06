import type { ExamSubtestKind } from '@sutinki/schema';

import { pluralUk } from '@/lib/uk-plural';

import type { TodayStep } from './readiness';
import { SUBTEST_LABELS, topicLabel } from './topics';

/**
 * «Сьогодні» / «Тренування дня» presentation (T70, UT16b) — pure: turns
 * the recommender's `TodayStep` into Ukrainian copy and a navigation target.
 * The hub section, the Today «Іспит» card and the daily segment share it.
 */

export interface TopicTarget {
  packId: string;
  examId: string;
}

export type TodayAction =
  | { kind: 'drill'; source: 'set'; packId: string; examId: string; topic: string }
  | { kind: 'drill'; source: 'deck' }
  | { kind: 'hub' };

const CARDS = ['картка', 'картки', 'карток'] as const;

export function describeStep(step: TodayStep): { title: string; caption: string } {
  switch (step.kind) {
    case 'topic':
      return {
        title: `Підтягни: ${topicLabel(step.topic).uk}`,
        caption: `${SUBTEST_LABELS[step.subtestKind].short} · зараз ${step.accuracy}% правильних — найслабша тема`,
      };
    case 'deck':
      return {
        title: `Робота над помилками · ${step.due}`,
        caption: `${step.due} ${pluralUk(step.due, CARDS)} до повторення сьогодні`,
      };
    case 'mock':
      return {
        title: 'Час на пробний іспит',
        caption: 'Понад тиждень без варіанта, а всі розділи близько порогу — перевір себе повністю',
      };
    case 'start':
      return {
        title: 'Почни з тренування',
        caption: `${SUBTEST_LABELS[step.subtestKind].short}: перші завдання допоможуть оцінити рівень`,
      };
  }
}

/**
 * Where a step goes. A topic step starts that topic's drill straight away
 * (the tile's exam); `start` opens the first tile of its subtest; `mock`
 * and unresolvable steps open the hub.
 */
export function stepAction(
  step: TodayStep,
  tilesByTopic: ReadonlyMap<string, TopicTarget>,
  firstTopicOfKind: Partial<Record<ExamSubtestKind, string>>,
): TodayAction {
  if (step.kind === 'deck') return { kind: 'drill', source: 'deck' };
  if (step.kind === 'mock') return { kind: 'hub' };
  const topic = step.kind === 'topic' ? step.topic : firstTopicOfKind[step.subtestKind];
  const target = topic ? tilesByTopic.get(topic) : undefined;
  if (!topic || !target) return { kind: 'hub' };
  return { kind: 'drill', source: 'set', packId: target.packId, examId: target.examId, topic };
}
