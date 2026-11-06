import { pluralUk } from '@/lib/uk-plural';

import type { InstructionLang } from './settings-core';

/**
 * The «Іспит» INSTRUCTION copy table (T77 → UT17b): every string that tells the
 * candidate what to DO — buttons, status lines, task cards' chrome, alerts,
 * timing copy, «Білети», practice and debrief labels — lives here as a
 * `{ uk, en }` pair, and ONE toggle («UK | EN», pref `instructionLang`) flips a
 * whole screen. Default `uk` = the real test.
 *
 * What is NOT here and must never be translated on screen: examiner questions,
 * situations, topic titles / questions, reading passages, listening scripts
 * (that is CONTENT — translating it would make practice pointless). Pack
 * instructions already carry `instructions.en`; the screens pick by language.
 *
 * `__tests__/instruction-copy.test.ts` scans the listed screens so no Cyrillic
 * literal appears outside this file (and `speaking/timing-copy.ts`), and pins
 * that every key exists in both languages.
 */

export type Lang = InstructionLang;

function defineCopy<T extends Record<string, unknown>>(table: {
  [K in keyof T]: { uk: T[K]; en: T[K] };
}): (lang: Lang) => T {
  const cache = new Map<Lang, T>();
  return (lang) => {
    const hit = cache.get(lang);
    if (hit) return hit;
    const out = {} as T;
    for (const key of Object.keys(table) as (keyof T)[]) out[key] = table[key][lang];
    cache.set(lang, out);
    return out;
  };
}

/** English plural helper for the few counted nouns. */
function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** «5 хв» / «1 год 30 хв» vs «5 min» / «1 h 30 min». */
export function fmtMinutes(lang: Lang, min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const [hu, mu] = lang === 'uk' ? ['год', 'хв'] : ['h', 'min'];
  if (h === 0) return `${m} ${mu}`;
  if (m === 0) return `${h} ${hu}`;
  return `${h} ${hu} ${m} ${mu}`;
}

/** The locale for numbers (decimal comma in Ukrainian). */
export function numLocale(lang: Lang): string {
  return lang === 'uk' ? 'uk-UA' : 'en-US';
}

export const instructionCopy = defineCopy<{
  back: string;
  leave: string;
  quitExam: string;
  cancelBack: string;
  skipArrow: string;
  skipTask: string;
  skipTaskTitle: string;
  skipTaskBody: string;
  skipMonologueTitle: string;
  skipMonologueBody: string;
  returnBtn: string;
  // instruction screen
  beginSubtest: string;
  skipSubtest: string;
  timeFact: (time: string) => string;
  timeFactOverride: (sec: number, time: string) => string;
  itemsFact: (n: number) => string;
  dictOn: string;
  dictOff: string;
  listeningFact: (plays: number) => string;
  speakingFact: string;
  micFact: string;
  noCheckFact: string;
  taskFact: (task: number, count: number, min: number) => string;
  // speaking runner
  speaking: string;
  taskOf: (n: number, total: number) => string;
  chooseTopic: string;
  timeLeftA11y: (clock: string) => string;
  examinerSpeaking: string;
  listenExaminer: string;
  readyHeading: string;
  recordingHeading: string;
  savingHeading: string;
  answerHeading: string;
  replyCaption: string;
  situationCaption: string;
  synthetic: string;
  partClock: string;
  tapMic: string;
  tapMicHint: string;
  recordingHint: string;
  recordingCap: (sec: number) => string;
  secondsLeft: (sec: number) => string;
  done: string;
  recognising: string;
  topicStats: (q: number, min: number, max: number) => string;
  preparation: string;
  notesNotGraded: string;
  notes: string;
  yourNotes: string;
  notesPlaceholder: string;
  dictionary: string;
  prepDone: string;
  prepConfirmTitle: string;
  prepConfirmBody: (answerLine: string) => string;
  morePrep: string;
  ready: string;
  startAnswer: string;
  startAnswerHint: (answerLine: string) => string;
  answer: string;
  warn10: string;
  recordLabel: string;
  // practice (task 1/2)
  practiceTitle: string;
  untimed: string;
  examinerQuestion: string;
  situation: string;
  listenAnyTime: string;
  playExaminerA11y: string;
  practiceHintReady: string;
  practiceHintRecording: (cap: string) => string;
  again: string;
  practiceSaveFailTitle: string;
  practiceSaveFailBody: string;
  taskNotFound: string;
  // tickets
  tickets: string;
  ticketsSub: (n: number) => string;
  drawTicket: string;
  ticketsEmpty: string;
  ticketRandom: string;
  ticket: string;
  startPrep: (min: number) => string;
  returnToDeck: string;
  sentencesNotes: (min: number, max: number) => string;
  /** UT16b: a photo item shows its description until the picture can be displayed (UT16c). */
  photoAlt: (alt: string) => string;
  anotherTicket: string;
  // debrief
  debriefTitle: string;
  provisional: string;
  aiGraded: string;
  selfChecked: string;
  speakingNotFound: string;
  nothingToGrade: string;
  downloading: string;
  recordsOnDevice: (kb: string) => string;
  inBackup: string;
  backupWaiting: string;
  backupFailed: string;
  pinned: string;
  recordsInBackup: string;
  recordsDeleted: string;
  noRecords: string;
  downloadA11y: string;
  downloadBtn: string;
  examiner: string;
  yourAnswer: (dur: string) => string;
  noRecording: string;
  nothingRecognised: string;
  modelAnswer: string;
  modelMonologue: string;
  aiGrading: string;
  waitingNet: string;
  aiFailed: (code: string | null) => string;
  offlineOnly: string;
  retryGrade: string;
  practiseBtn: string;
  ticketsBtn: string;
  topicNotChosen: string;
  noAnswer: string;
  verdictTask3: (
    covered: number,
    total: number,
    sentences: number,
    min: number,
    words: number,
    wpm: number,
  ) => string;
  verdictMatched: string;
  verdictNear: string;
  verdictSilent: string;
  verdictMiss: string;
  verdictFull: string;
  verdictShort: (have: number, need: number) => string;
  viaWhisper: string;
  // writing
  writing: string;
  writingTask: (n: number) => string;
  practiceSuffix: string;
  sentencesShort: (n: number) => string;
  empty: string;
  submitWritingMulti: string;
  submitWriting: string;
  bothEmpty: string;
  letterEmpty: string;
  afterSubmit: (detail: string) => string;
  submit: string;
  cancelReturn: string;
  minSentences: (n: number) => string;
  questionsNeeded: (min: number, max: number | null, singular: boolean) => string;
  dictAllowedSuffix: string;
  messageToFriend: string;
  keyboardHint: string;
  wPracticeTitle: string;
  wPracticeSubmitTitle: string;
  wPracticeSubmitBody: string;
  wSaveFailTitle: string;
  wSaveFailBody: string;
  wAiGrading: string;
  wAiFailed: string;
  wProvisional: string;
  wPoints: (
    covered: number,
    total: number,
    sentences: number,
    questions: number,
    greeting: boolean,
    signOff: boolean,
  ) => string;
  selfCheck: string;
  modelLetter: string;
  openInReader: string;
  // gates + run
  gateAsr: string;
  gateMic: string;
  openSpeechSettings: string;
  audioMissing: string;
  checkingAudio: string;
  quitTitle: string;
  quitBody: string;
  quitContinue: string;
  quitSave: string;
  quitAbandon: string;
  openFail: string;
  countingResult: string;
  toggleA11y: string;
}>({
  back: { uk: 'Назад', en: 'Back' },
  leave: { uk: 'Вийти', en: 'Exit' },
  quitExam: { uk: 'Вийти з іспиту', en: 'Leave the exam' },
  cancelBack: { uk: 'Повернутися', en: 'Go back' },
  skipArrow: { uk: 'Пропустити →', en: 'Skip →' },
  skipTask: { uk: 'Пропустити', en: 'Skip' },
  skipTaskTitle: { uk: 'Пропустити завдання?', en: 'Skip this task?' },
  skipTaskBody: {
    uk: 'Відповіді не буде — завдання зарахується як порожнє.',
    en: 'No answer will be recorded — the task counts as empty.',
  },
  skipMonologueTitle: { uk: 'Пропустити монолог?', en: 'Skip the monologue?' },
  skipMonologueBody: {
    uk: 'Це завдання буде зараховано як порожнє.',
    en: 'This task will count as empty.',
  },
  returnBtn: { uk: 'Повернутися', en: 'Go back' },

  beginSubtest: { uk: 'Почати розділ', en: 'Start the section' },
  skipSubtest: { uk: 'Пропустити цей розділ', en: 'Skip this section' },
  timeFact: { uk: (t: string) => `Час: ${t}`, en: (t: string) => `Time: ${t}` },
  timeFactOverride: {
    uk: (s: number, t: string) => `ТЕСТ: ${s} с (замість ${t})`,
    en: (s: number, t: string) => `TEST: ${s} s (instead of ${t})`,
  },
  itemsFact: { uk: (n: number) => `Завдань: ${n}`, en: (n: number) => `Items: ${n}` },
  dictOn: { uk: 'Словник дозволено (торкнися слова)', en: 'Dictionary allowed (tap a word)' },
  dictOff: { uk: 'Без словника', en: 'No dictionary' },
  listeningFact: {
    uk: (p: number) =>
      `Кожен запис звучить ${p} ${pluralUk(p, ['раз', 'рази', 'разів'])}. Назад не можна.`,
    en: (p: number) => `Each text plays ${p} times. You cannot go back.`,
  },
  speakingFact: {
    uk: 'Кожна відповідь записується; підказок і повторів немає.',
    en: 'Every answer is recorded; no hints, no repeats.',
  },
  micFact: {
    uk: 'Мікрофон вмикаєш ти: торкнися, щоб почати, і «Готово», щоб закінчити. Паузи запис не зупиняють.',
    en: 'You open the mic yourself: tap to start, tap Done to finish. Pauses never stop the recording.',
  },
  noCheckFact: {
    uk: 'Перевірки відповідей не буде — результат після здачі.',
    en: 'No answer checking — you get the result after you finish.',
  },
  taskFact: {
    uk: (task: number, count: number, min: number) =>
      `Завдання ${task}: ${count} ${task === 1 ? pluralUk(count, ['запитання екзаменатора', 'запитання екзаменатора', 'запитань екзаменатора']) : pluralUk(count, ['ситуація', 'ситуації', 'ситуацій'])}, ${min} хв на частину.`,
    en: (task: number, count: number, min: number) =>
      `Task ${task}: ${count} ${task === 1 ? 'examiner questions' : 'situations'}, ${min} min for the part.`,
  },

  speaking: { uk: 'Говоріння', en: 'Speaking' },
  taskOf: {
    uk: (n: number, t: number) => `Завдання ${n} з ${t}`,
    en: (n: number, t: number) => `Task ${n} of ${t}`,
  },
  chooseTopic: { uk: 'Вибір теми', en: 'Choose a topic' },
  timeLeftA11y: {
    uk: (c: string) => `Залишилось ${c}`,
    en: (c: string) => `Time left ${c}`,
  },
  examinerSpeaking: { uk: 'Екзаменатор говорить…', en: 'The examiner is speaking…' },
  listenExaminer: { uk: 'Слухай екзаменатора', en: 'Listen to the examiner' },
  readyHeading: { uk: 'Торкнися й говори', en: 'Tap the mic and answer' },
  recordingHeading: { uk: 'Запис… говори', en: 'Recording… speak' },
  savingHeading: { uk: 'Зберігаю відповідь…', en: 'Saving your answer…' },
  answerHeading: { uk: 'Відповідь', en: 'Answer' },
  replyCaption: {
    uk: 'Запитання звучить один раз. Відповідай повним реченням.',
    en: 'The question plays once. Answer in a full sentence.',
  },
  situationCaption: {
    uk: 'Прочитай ситуацію й почни діалог першим.',
    en: 'Read the situation and start the dialogue.',
  },
  synthetic: { uk: ' · синтез мовлення', en: ' · synthetic voice' },
  partClock: { uk: 'Час на цю частину', en: 'Time left for this part' },
  tapMic: { uk: 'Торкнися мікрофона', en: 'Tap the mic' },
  tapMicHint: {
    uk: 'Думай, скільки потрібно. Мікрофон увімкнеться, коли торкнешся.',
    en: 'Take your time. The mic opens only when you tap it.',
  },
  recordingHint: {
    uk: 'Паузи можна. Закінчиш — торкнися «Готово».',
    en: 'Pauses are fine. Tap Done when you finish.',
  },
  recordingCap: {
    uk: (s: number) => `Не більше ${s} с`,
    en: (s: number) => `${s} s at most`,
  },
  secondsLeft: { uk: (s: number) => `Залишилось ${s} с`, en: (s: number) => `${s} s left` },
  done: { uk: 'Готово', en: 'Done' },
  recognising: { uk: 'Розпізнаю…', en: 'Transcribing…' },
  topicStats: {
    uk: (q: number, a: number, b: number) =>
      `${q} ${pluralUk(q, ['запитання', 'запитання', 'запитань'])} · ${a}–${b} ${pluralUk(b, ['речення', 'речення', 'речень'])}`,
    en: (q: number, a: number, b: number) => `${q} questions · ${a}–${b} sentences`,
  },
  preparation: { uk: 'Підготовка', en: 'Preparation' },
  notesNotGraded: { uk: 'Нотатки (не оцінюються)', en: 'Notes (not graded)' },
  notes: { uk: 'Нотатки', en: 'Notes' },
  yourNotes: { uk: 'Твої нотатки', en: 'Your notes' },
  notesPlaceholder: { uk: 'Ключові слова, план відповіді…', en: 'Key words, a plan…' },
  dictionary: { uk: 'Словник', en: 'Dictionary' },
  prepDone: { uk: 'Готово — до відповіді', en: 'Done preparing' },
  prepConfirmTitle: { uk: 'Закінчити підготовку?', en: 'Finish preparing?' },
  prepConfirmBody: {
    uk: (a: string) => `Далі торкнешся «Почати відповідь». На відповідь — ${a}.`,
    en: (a: string) => `Next you tap Start answer. You get ${a} to answer.`,
  },
  morePrep: { uk: 'Ще підготуюся', en: 'A bit more prep' },
  ready: { uk: 'Готовий', en: 'Ready' },
  startAnswer: { uk: 'Почати відповідь', en: 'Start answer' },
  startAnswerHint: {
    uk: (a: string) => `Підготовку завершено. Торкнися, коли будеш готовий — запис триватиме ${a}.`,
    en: (a: string) => `Preparation is over. Tap when you are ready — the recording runs ${a}.`,
  },
  answer: { uk: 'Відповідь', en: 'Answer' },
  warn10: { uk: 'Залишилось 10 секунд — закінчуй думку.', en: '10 seconds left — wrap up.' },
  recordLabel: { uk: 'Запис', en: 'Recording' },

  practiceTitle: { uk: 'Говоріння · тренування', en: 'Speaking · practice' },
  untimed: { uk: 'без таймера', en: 'untimed' },
  examinerQuestion: { uk: 'Запитання екзаменатора', en: "Examiner's question" },
  situation: { uk: 'Ситуація', en: 'Situation' },
  listenAnyTime: { uk: 'Можна слухати скільки завгодно', en: 'Listen as often as you like' },
  playExaminerA11y: { uk: 'Прослухати запитання', en: 'Play the examiner line' },
  practiceHintReady: { uk: 'Торкнися й відповідай', en: 'Tap and answer' },
  practiceHintRecording: {
    uk: (cap: string) => `Говори · «Готово», коли закінчиш · до ${cap}`,
    en: (cap: string) => `Speak · tap Done when finished · up to ${cap}`,
  },
  again: { uk: 'Ще раз', en: 'Again' },
  practiceSaveFailTitle: { uk: 'Не вдалося зберегти відповідь', en: 'Could not save the answer' },
  practiceSaveFailBody: { uk: 'Спробуй ще раз.', en: 'Please try again.' },
  taskNotFound: { uk: 'Завдання не знайдено.', en: 'Task not found.' },

  tickets: { uk: 'Білети', en: 'Tickets' },
  ticketsSub: {
    uk: (n: number) => `Монолог · ${n} ${pluralUk(n, ['тема', 'теми', 'тем'])}`,
    en: (n: number) => `Monologue · ${n} ${plural(n, 'topic', 'topics')}`,
  },
  drawTicket: { uk: 'Витягнути білет', en: 'Draw a ticket' },
  ticketsEmpty: { uk: 'Теми з’являться разом з іспитами', en: 'Topics arrive with the exams' },
  ticketRandom: { uk: 'Випадкова тема монологу', en: 'A random monologue topic' },
  ticket: { uk: 'Білет', en: 'Ticket' },
  startPrep: {
    uk: (m: number) => `Почати підготовку · ${m} хв`,
    en: (m: number) => `Start preparing · ${m} min`,
  },
  returnToDeck: { uk: 'Повернути до колоди', en: 'Back to the deck' },
  sentencesNotes: {
    uk: (a: number, b: number) =>
      `${a}–${b} ${pluralUk(b, ['речення', 'речення', 'речень'])}. Нотатки не оцінюються.`,
    en: (a: number, b: number) => `${a}–${b} sentences. Notes are not graded.`,
  },
  photoAlt: {
    uk: (alt: string) => `Фото: ${alt}`,
    en: (alt: string) => `Photo: ${alt}`,
  },
  anotherTicket: { uk: 'Ще білет', en: 'Another ticket' },

  debriefTitle: { uk: 'Говоріння · розбір', en: 'Speaking · review' },
  provisional: { uk: ' · попередньо', en: ' · provisional' },
  aiGraded: { uk: ' · оцінка ШІ', en: ' · AI graded' },
  selfChecked: { uk: ' · самоперевірка', en: ' · self-checked' },
  speakingNotFound: { uk: 'Говоріння не знайдено.', en: 'Speaking attempt not found.' },
  nothingToGrade: {
    uk: 'Нічого оцінювати — відповідь порожня.',
    en: 'Nothing to grade — the answer is empty.',
  },
  downloading: { uk: 'Завантажую записи…', en: 'Downloading recordings…' },
  recordsOnDevice: {
    uk: (kb: string) => `Записи на пристрої · ${kb}`,
    en: (kb: string) => `Recordings on this device · ${kb}`,
  },
  inBackup: { uk: ' · у резервній копії', en: ' · backed up' },
  backupWaiting: { uk: ' · копія чекає на зв’язок', en: ' · backup waiting for a connection' },
  backupFailed: { uk: ' · копія не завантажилась', en: ' · backup failed' },
  pinned: { uk: ' · закріплено', en: ' · pinned' },
  recordsInBackup: { uk: 'Записи в резервній копії', en: 'Recordings are in the backup' },
  recordsDeleted: {
    uk: 'Записи видалено (резервної копії не було)',
    en: 'Recordings deleted (there was no backup)',
  },
  noRecords: { uk: 'Записів немає', en: 'No recordings' },
  downloadA11y: { uk: 'Завантажити запис', en: 'Download the recording' },
  downloadBtn: { uk: 'Завантажити', en: 'Download' },
  examiner: { uk: 'Екзаменатор', en: 'Examiner' },
  yourAnswer: {
    uk: (d: string) => `Твоя відповідь · ${d}`,
    en: (d: string) => `Your answer · ${d}`,
  },
  noRecording: { uk: 'Немає запису', en: 'No recording' },
  nothingRecognised: { uk: 'Нічого не розпізнано.', en: 'Nothing was recognised.' },
  modelAnswer: { uk: 'Зразок відповіді', en: 'Model answer' },
  modelMonologue: { uk: 'Зразок монологу', en: 'Model monologue' },
  aiGrading: { uk: 'ШІ оцінює…', en: 'The AI is grading…' },
  waitingNet: {
    uk: 'Чекає на зв’язок: ШІ оцінить, коли з’явиться інтернет.',
    en: 'Waiting for a connection — the AI grades when you are online.',
  },
  aiFailed: {
    uk: (code: string | null) => `Оцінка ШІ не вдалася${code ? ` (${code})` : ''}.`,
    en: (code: string | null) => `AI grading failed${code ? ` (${code})` : ''}.`,
  },
  offlineOnly: {
    uk: 'Поки що лише офлайн-критерії; ШІ оцінить граматику.',
    en: 'Offline criteria only for now; the AI will grade grammar.',
  },
  retryGrade: { uk: 'Повторити оцінювання', en: 'Retry grading' },
  practiseBtn: { uk: 'Практикувати', en: 'Practise' },
  ticketsBtn: { uk: 'Білети', en: 'Tickets' },
  topicNotChosen: { uk: 'Тему не обрано', en: 'Topic not chosen' },
  noAnswer: { uk: 'Без відповіді', en: 'No answer' },
  verdictTask3: {
    uk: (c: number, t: number, s: number, m: number, w: number, wpm: number) =>
      `Запитань розкрито ${c} з ${t} · речень ≈ ${s} (потрібно ${m}) · ${w} ${pluralUk(w, ['слово', 'слова', 'слів'])}${wpm > 0 ? ` · ${Math.round(wpm)} сл/хв` : ''}`,
    en: (c: number, t: number, s: number, m: number, w: number, wpm: number) =>
      `Questions covered ${c} of ${t} · sentences ≈ ${s} (need ${m}) · ${w} words${wpm > 0 ? ` · ${Math.round(wpm)} wpm` : ''}`,
  },
  verdictMatched: { uk: '✓ за завданням', en: '✓ on task' },
  verdictNear: { uk: '≈ майже', en: '≈ almost' },
  verdictSilent: { uk: 'тиша', en: 'silence' },
  verdictMiss: { uk: '✗ повз завдання', en: '✗ off task' },
  verdictFull: { uk: 'повна відповідь', en: 'full answer' },
  verdictShort: {
    uk: (h: number, n: number) => `коротка відповідь (${h} з ${n} слів)`,
    en: (h: number, n: number) => `short answer (${h} of ${n} words)`,
  },
  viaWhisper: { uk: ' · за Whisper', en: ' · via Whisper' },

  writing: { uk: 'Письмо', en: 'Writing' },
  writingTask: { uk: (n: number) => `Завдання ${n}`, en: (n: number) => `Task ${n}` },
  practiceSuffix: { uk: ' · тренування', en: ' · practice' },
  sentencesShort: { uk: (n: number) => `${n} реч.`, en: (n: number) => `${n} sent.` },
  empty: { uk: 'порожньо', en: 'empty' },
  submitWritingMulti: { uk: 'Здати письмову роботу?', en: 'Submit your writing?' },
  submitWriting: { uk: 'Здати письмо?', en: 'Submit the letter?' },
  bothEmpty: {
    uk: 'Обидва завдання порожні — розділ буде оцінено в 0 %.',
    en: 'Both tasks are empty — the subtest scores 0 %.',
  },
  letterEmpty: {
    uk: 'Письмо порожнє — розділ буде оцінено в 0 %.',
    en: 'The letter is empty — the subtest scores 0 %.',
  },
  afterSubmit: {
    uk: (d: string) =>
      `Після здачі текст змінити не можна. Оцінка з’явиться одразу (попередня), ШІ оцінить пізніше.${d}`,
    en: (d: string) =>
      `You cannot edit after submitting. A provisional score appears at once; the AI grades later.${d}`,
  },
  submit: { uk: 'Здати', en: 'Submit' },
  cancelReturn: { uk: 'Повернутися', en: 'Go back' },
  minSentences: {
    uk: (n: number) => `Не менше ${n} речень`,
    en: (n: number) => `At least ${n} sentences`,
  },
  questionsNeeded: {
    uk: (min: number, max: number | null, singular: boolean) =>
      `, ${min}${max ? `–${max}` : ''} ${singular ? 'запитання' : pluralUk(max ?? min, ['запитання', 'запитання', 'запитань'])}`,
    en: (min: number, max: number | null, singular: boolean) =>
      `, ${min}${max ? `–${max}` : ''} ${singular ? 'question' : 'questions'}`,
  },
  dictAllowedSuffix: { uk: ' Можна користуватися словником.', en: ' You may use the dictionary.' },
  messageToFriend: { uk: 'Повідомлення другові', en: 'A message to a friend' },
  keyboardHint: {
    uk: 'Увімкни українську клавіатуру. Лічильники рахують речення за крапками та знаками питання.',
    en: 'Switch to the Ukrainian keyboard. The counters count sentences by full stops and question marks.',
  },
  wPracticeTitle: { uk: 'Письмо · тренування', en: 'Writing · practice' },
  wPracticeSubmitTitle: { uk: 'Здати письмо?', en: 'Submit the letter?' },
  wPracticeSubmitBody: {
    uk: 'Оцінка з’явиться одразу; ШІ оцінить, коли буде зв’язок.',
    en: 'You get a score at once; the AI grades when you are online.',
  },
  wSaveFailTitle: { uk: 'Не вдалося зберегти письмо', en: 'Could not save the letter' },
  wSaveFailBody: { uk: 'Спробуй ще раз.', en: 'Please try again.' },
  wAiGrading: { uk: 'ШІ оцінює письмо…', en: 'The AI is grading your letter…' },
  wAiFailed: {
    uk: 'Оцінка ШІ не вдалася — попередня лишилась.',
    en: 'AI grading failed — the provisional score stays.',
  },
  wProvisional: {
    uk: 'Поки що лише офлайн-критерії. ШІ оцінить, коли буде зв’язок і ключ.',
    en: 'Offline criteria only for now. The AI grades when you are online with a key.',
  },
  wPoints: {
    uk: (c: number, t: number, s: number, q: number, g: boolean, o: boolean) =>
      `Пункти: ${c} з ${t} · речень ${s} · запитань ${q}${g ? ' · привітання ✓' : ' · без привітання'}${o ? ' · прощання ✓' : ' · без прощання'}`,
    en: (c: number, t: number, s: number, q: number, g: boolean, o: boolean) =>
      `Points: ${c} of ${t} · sentences ${s} · questions ${q}${g ? ' · greeting ✓' : ' · no greeting'}${o ? ' · sign-off ✓' : ' · no sign-off'}`,
  },
  selfCheck: { uk: 'Самоперевірка', en: 'Self-check' },
  modelLetter: { uk: 'Зразок письма', en: 'Model letter' },
  openInReader: { uk: 'Відкрити в читалці', en: 'Open in the reader' },

  gateAsr: {
    uk: 'Немає моделі розпізнавання мовлення: без неї відповіді не оцінюються. Встанови модель розпізнавання українського мовлення в налаштуваннях («Розпізнавання мовлення») і повернися — або пропусти розділ.',
    en: 'The speech-recognition model is missing, so answers cannot be graded. Install the Ukrainian speech-recognition model in Settings (Speech recognition) and come back — or skip the section.',
  },
  gateMic: {
    uk: 'Мікрофон заборонено: дозволь запис звуку для «Сутінок» у налаштуваннях системи й повернися — або пропусти розділ.',
    en: 'The microphone is blocked: allow audio recording for Sutinki in system settings and come back — or skip the section.',
  },
  openSpeechSettings: { uk: 'Відкрити налаштування мовлення', en: 'Open speech settings' },
  audioMissing: {
    uk: 'Завантаж аудіо через Wi-Fi: без файлів іспит не звучить. Підключися до Wi-Fi, синхронізуй пакет і повернися.',
    en: 'Download the audio on Wi-Fi: without the files the exam stays silent. Connect to Wi-Fi, sync the pack and come back.',
  },
  checkingAudio: { uk: 'Перевіряємо аудіо…', en: 'Checking the audio…' },
  quitTitle: { uk: 'Вийти з іспиту?', en: 'Leave the exam?' },
  quitBody: {
    uk: 'Прогрес збережеться, таймер триватиме за годинником.',
    en: 'Your progress is saved; the timer keeps running on the clock.',
  },
  quitContinue: { uk: 'Продовжити', en: 'Continue' },
  quitSave: { uk: 'Зберегти й вийти', en: 'Save and leave' },
  quitAbandon: { uk: 'Завершити спробу', en: 'End the attempt' },
  openFail: { uk: 'Не вдалося відкрити іспит.', en: 'Could not open the exam.' },
  countingResult: { uk: 'Рахуємо результат…', en: 'Counting your result…' },
  toggleA11y: { uk: 'Мова інструкцій', en: 'Instruction language' },
});

/** Non-switching Ukrainian CONTENT hints (the answer itself must be Ukrainian). */
export const UK_CONTENT = {
  letterPlaceholder: 'Привіт, …',
} as const;
