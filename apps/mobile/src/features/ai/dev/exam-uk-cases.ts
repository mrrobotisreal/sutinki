import type { ExamSpeakingInput } from '../prompts/exam-speaking';
import type { ExamWritingInput } from '../prompts/exam-writing';

/**
 * UT17b capture cases: the Ukrainian «Іспит» grading inputs the dev-only capture screen
 * (`app/dev-exam-capture.tsx`) sends to the configured graders and `__tests__/__fixtures__/exam-uk-*.json`
 * mirror. Nine cases: writing A1 message strong / weak, A2 text strong / weak, B1 text strong / weak; speaking
 * dialogue reply (A1), photo (A1), monologue (A2). Candidate texts are authored with realistic slips of a
 * Russian-speaking learner (surzhyk, case endings). Until Mitch captures live grades the committed fixtures are
 * hand-written and marked `"_synthetic": true`.
 */

export type UkCaptureCase =
  | { name: string; kind: 'writing'; input: ExamWritingInput }
  | { name: string; kind: 'speaking'; input: ExamSpeakingInput };

const MESSAGE_TASK = {
  taskUk:
    'Ваш друг запросив вас на день народження. Напишіть йому коротке повідомлення: подякуйте, скажіть, чи прийдете, і запитайте, що принести.',
  bullets: [
    { id: 'b1', uk: 'подякуйте за запрошення' },
    { id: 'b2', uk: 'скажіть, що ви прийдете' },
    { id: 'b3', uk: 'запитайте, що принести' },
  ],
  minSentences: 3,
  minQuestions: 1,
  maxQuestions: 2,
  minWords: 10,
  maxWords: 25,
  taskTopic: 'wr-message',
  level: 'A1' as const,
  modelLetter: null,
};

const A2_TEXT_TASK = {
  taskUk: 'Напишіть розповідь про свій вихідний день. Обовʼязково напишіть про такі пункти.',
  bullets: [
    { id: 'b1', uk: 'де ви були' },
    { id: 'b2', uk: 'з ким ви були' },
    { id: 'b3', uk: 'що ви робили' },
    { id: 'b4', uk: 'що вам сподобалося' },
  ],
  minSentences: 6,
  minQuestions: 0,
  maxQuestions: null,
  minWords: 50,
  maxWords: 70,
  taskTopic: 'wr-text',
  level: 'A2' as const,
  modelLetter: null,
};

const B1_TEXT_TASK = {
  taskUk:
    'Напишіть текст «Чому важливо знати державну мову». Обовʼязково напишіть про такі пункти.',
  bullets: [
    { id: 'b1', uk: 'чому ви вчите українську' },
    { id: 'b2', uk: 'де ви вже користуєтеся мовою' },
    { id: 'b3', uk: 'що вам дається найважче' },
    { id: 'b4', uk: 'як ви вчитеся' },
    { id: 'b5', uk: 'що ви плануєте далі' },
  ],
  minSentences: 8,
  minQuestions: 0,
  maxQuestions: null,
  minWords: 100,
  maxWords: 150,
  taskTopic: 'wr-text',
  level: 'B1' as const,
  modelLetter: null,
};

export const UK_CAPTURE_CASES: UkCaptureCase[] = [
  {
    name: 'a1-message-strong',
    kind: 'writing',
    input: {
      ...MESSAGE_TASK,
      letter:
        'Привіт, Оксано!\nДякую за запрошення! Я обовʼязково прийду на твій день народження.\nЩо мені принести? Можу купити торт.\nДо зустрічі!',
    },
  },
  {
    name: 'a1-message-weak',
    kind: 'writing',
    input: {
      ...MESSAGE_TASK,
      letter: 'Привіт. Спасибі за приглашення. Я прийду. Що принести',
    },
  },
  {
    name: 'a2-text-strong',
    kind: 'writing',
    input: {
      ...A2_TEXT_TASK,
      letter:
        'Минулої неділі я їздив до Львова з моєю нареченою Оленою.\nМи прокинулися рано і поїхали потягом. У місті ми гуляли центром, пили каву і фотографували старі будинки.\nПотім ми пообідали в маленькому ресторані та пішли до музею.\nМені дуже сподобалася архітектура і смачна їжа. Увечері ми повернулися додому втомлені, але щасливі.',
    },
  },
  {
    name: 'a2-text-weak',
    kind: 'writing',
    input: {
      ...A2_TEXT_TASK,
      letter:
        'В воскресенье я був в парк з друг. Ми гуляли і кушали морозиво. Мені нравилось погода. Потом ми ходили в магазин і купили подарок.',
    },
  },
  {
    name: 'b1-text-strong',
    kind: 'writing',
    input: {
      ...B1_TEXT_TASK,
      letter:
        'Я вивчаю українську мову, тому що живу з українкою і хочу розмовляти з її родиною без перекладача. Крім того, я планую отримати громадянство, а для цього потрібно скласти іспит.\nВже зараз я користуюся мовою в магазині, у банку та на роботі, коли розмовляю з колегами. Люди завжди усміхаються, коли чують, що іноземець намагається говорити їхньою мовою.\nНайважче мені даються відмінки та вимова літери «ї». Іноді я плутаю слова, схожі на російські, і тоді виходить суржик.\nЩодня я слухаю подкасти, читаю короткі історії та записую нові слова. Раз на тиждень я розмовляю з викладачкою.\nНаступного року я хочу скласти іспит на рівень B1 і вільно спілкуватися з усіма, хто мені дорогий.',
    },
  },
  {
    name: 'b1-text-weak',
    kind: 'writing',
    input: {
      ...B1_TEXT_TASK,
      letter:
        'Я учу украінську мову потому що я живу в Україні. Я використовую мову в магазині. Мені тяжко давається відмінки. Я слідуючий рік хочу здати екзамен. Дякую.',
    },
  },
  {
    name: 'a1-dialogue-reply',
    kind: 'speaking',
    input: {
      task: 'reply',
      promptUk: 'Де ви зараз живете?',
      transcript: 'я зараз живу в колорадо з моя наречена вона українка',
      assistTranscript: 'Я зараз живу в Колорадо з моя наречена, вона українка.',
      modelAnswer: 'Я зараз живу в Києві.',
      level: 'A1',
    },
  },
  {
    name: 'a1-photo',
    kind: 'speaking',
    input: {
      task: 'photo',
      promptUk: 'Опишіть фото',
      imageAlt: 'Родина з трьох людей обідає за столом на кухні; на столі суп і хліб.',
      questionsUk: ['Де вони?', 'Хто це?', 'Що вони роблять?'],
      minSentences: 5,
      maxSentences: 7,
      transcript:
        'на фото я бачу родину вони на кухні мама тато і дочка вони обідають на столі суп і хліб вони щасливі',
      assistTranscript: null,
      modelAnswer: null,
      level: 'A1',
    },
  },
  {
    name: 'a2-monologue',
    kind: 'speaking',
    input: {
      task: 'monologue',
      promptUk: 'Моя родина',
      questionsUk: [
        'Хто у вашій родині?',
        'Де вони живуть?',
        'Що вони роблять?',
        'Що ви любите робити разом?',
      ],
      minSentences: 12,
      maxSentences: 15,
      transcript:
        'у мене невелика родина мама тато і сестра мама працює вчителькою тато працює інженером сестра ще вчиться в школі вони живуть в аризона я живу в колорадо ми часто розмовляємо по телефону на вихідних ми любимо готувати разом і дивитися фільми',
      assistTranscript:
        'У мене невелика родина: мама, тато і сестра. Мама працює вчителькою, тато працює інженером, сестра ще вчиться в школі. Вони живуть в Арізоні, я живу в Колорадо. Ми часто розмовляємо по телефону. На вихідних ми любимо готувати разом і дивитися фільми.',
      modelAnswer: null,
      level: 'A2',
    },
  },
];
