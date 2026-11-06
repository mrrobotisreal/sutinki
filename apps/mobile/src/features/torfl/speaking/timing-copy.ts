import { pluralUk } from '@/lib/uk-plural';

import { minutesUk } from '../minutes-uk';
import type { InstructionLang } from '../settings-core';

/**
 * Every task-3 timing string, generated from the windows in play (T76, A2-9):
 * the exam speaking screen, the instruction facts, «Білети» and the tickets
 * screen all read these, so a level's numbers live in ONE place (the item /
 * the level profile) and never in copy. T77: each takes a `lang` (default
 * 'uk' = the real test) — the English twin is the same sentence, plain words.
 */

/** «8 хвилин» / "8 minutes". */
export function minutesLang(sec: number, lang: InstructionLang = 'uk'): string {
  if (lang === 'uk') return minutesUk(sec);
  const n = Math.round(sec / 60);
  return `${n} ${n === 1 ? 'minute' : 'minutes'}`;
}

/** «8 хвилин на підготовку, потім 2 хвилини на відповідь». */
export function windowsLine(
  prepSec: number,
  answerSec: number,
  lang: InstructionLang = 'uk',
): string {
  return lang === 'uk'
    ? `${minutesUk(prepSec)} на підготовку, потім ${minutesUk(answerSec)} на відповідь`
    : `${minutesLang(prepSec, 'en')} to prepare, then ${minutesLang(answerSec, 'en')} to answer`;
}

/** The choose-step lead: «Монолог. Обери одну з двох тем. Після вибору — …». Only for a group of two. */
export function chooseLine(
  topicCount: number,
  prepSec: number,
  answerSec: number,
  lang: InstructionLang = 'uk',
): string {
  if (lang === 'en') {
    const lead =
      topicCount === 2
        ? 'Pick one of the two topics. After you pick: '
        : 'Pick a topic. After you pick: ';
    return `Monologue. ${lead}${windowsLine(prepSec, answerSec, 'en')}.`;
  }
  const lead =
    topicCount === 2 ? 'Обери одну з двох тем. Після вибору — ' : 'Обери тему. Після вибору — ';
  return `Монолог. ${lead}${windowsLine(prepSec, answerSec)}.`;
}

/** The instruction-screen fact: two topics → «одна тема з двох», one → «одна тема». */
export function task3Fact(
  topicCount: number,
  prepSec: number,
  answerSec: number,
  lang: InstructionLang = 'uk',
): string {
  if (lang === 'en') {
    const topics =
      topicCount === 2
        ? 'one topic out of two'
        : topicCount === 1
          ? 'one topic'
          : `one of ${topicCount} topics`;
    const mins = (s: number) => `${Math.round(s / 60)} min`;
    return `Monologue: ${topics}, ${mins(prepSec)} to prepare, ${mins(answerSec)} to answer.`;
  }
  const topics =
    topicCount === 2
      ? 'одна тема з двох'
      : topicCount === 1
        ? 'одна тема'
        : `одна з ${topicCount} тем`;
  const mins = (s: number) => `${Math.round(s / 60)} хв`;
  return `Монолог: ${topics}, підготовка ${mins(prepSec)}, відповідь ${mins(answerSec)}.`;
}

/** The recording-start confirm body (T77: the answer starts at HIS tap, so the line says what the window is). */
export function startAnswerLine(answerSec: number, lang: InstructionLang = 'uk'): string {
  return lang === 'uk'
    ? `Запис почнеться одразу: ${minutesUk(answerSec)}, таймер не зупиняється.`
    : `Recording starts at once: ${minutesLang(answerSec, 'en')}, and the timer cannot be paused.`;
}

/** The answering caption: «Триває запис — 5 хвилин». */
export function recordingLine(answerSec: number, lang: InstructionLang = 'uk'): string {
  return lang === 'uk'
    ? `Триває запис — ${minutesUk(answerSec)}`
    : `Recording — ${minutesLang(answerSec, 'en')}`;
}

/** The prep-card hint: «Розкажи 12–15 речень. …» */
export function sentencesLine(min: number, max: number, lang: InstructionLang = 'uk'): string {
  return lang === 'uk'
    ? `Розкажи ${min}–${max} ${pluralUk(max, ['речення', 'речення', 'речень'])}. Відповідати треба без тексту — нотатки лише для підготовки.`
    : `Say ${min}–${max} sentences. You answer without text — notes are for preparation only.`;
}

/** «5 хвилин» wording used inside the instruction copy ("5 minutes"). */
export function answerWindow(answerSec: number, lang: InstructionLang = 'uk'): string {
  return minutesLang(answerSec, lang);
}
