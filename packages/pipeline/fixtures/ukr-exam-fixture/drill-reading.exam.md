---
pack:
  id: a1-ukrexam-fixture
  version: 1
  type: exam
  title: { uk: "Іспит A1: тестовий пакет", en: "Exam A1: fixture pack" }
  level: A1
  tags: ["ukr-exam", "ukr-exam:fixture"]
  category: ukr-exam-a1
exam:
  id: rd-liudyna
  format: ukr-state
  level: A1
  mode: drill
  title: { uk: 'Читання: про себе', en: 'Reading: about myself' }
  blurb: 'Заголовки, Правда/Неправда, питання й відповіді, пропуски.'
  subtests:
    - id: reading
      kind: reading
      title: { uk: 'Читання', en: 'Reading' }
      instructions: { uk: 'Оберіть правильну відповідь.', en: 'Choose the correct answer.' }
      durationMin: 12
      dictionary: false
      navigation: free
      pointsPerItem: 1
      maxPoints: 14
      parts:
        - id: rd-p1
          instructions: { uk: 'Завдання 1–3. Доберіть заголовки.', en: 'Items 1–3. Match headings.' }
          items:
            - id: rd01
              kind: matching
              topic: rd-heading
              variant: headings
              passage: { storyId: rd-01 }
              stem: 'Доберіть до кожного тексту заголовок. Два заголовки зайві.'
              left: ['Текст 1', 'Текст 2', 'Текст 3']
              right: ['Мене звати', 'Робота', 'Родина', 'Погода', 'Місто']
              key: [0, 1, 2]
              explain: 'Заголовки відповідають змісту речень.'
        - id: rd-p2
          instructions: { uk: 'Завдання 4–7. Правда чи Неправда?', en: 'Items 4–7. True or false?' }
          items:
            - id: rd02
              kind: choice
              topic: rd-tf
              variant: true-false
              passage: { storyId: rd-01, sentenceIds: [uxa1fx01r01-s02] }
              stem: 'Оксана живе в Києві.'
              options: ['Правда', 'Неправда']
              answer: 0
            - id: rd03
              kind: choice
              topic: rd-tf
              variant: true-false
              passage: { storyId: rd-01, sentenceIds: [uxa1fx01r01-s03] }
              stem: 'Оксана працює в школі.'
              options: ['Правда', 'Неправда']
              answer: 1
            - id: rd04
              kind: choice
              topic: rd-tf
              variant: true-false
              passage: { storyId: rd-01, sentenceIds: [uxa1fx01r01-s04] }
              stem: 'Оксана має родину.'
              options: ['Правда', 'Неправда']
              answer: 0
            - id: rd05
              kind: choice
              topic: rd-tf
              variant: true-false
              passage: { storyId: rd-01, sentenceIds: [uxa1fx01r01-s02] }
              stem: 'Оксана живе у Львові.'
              options: ['Правда', 'Неправда']
              answer: 1
        - id: rd-p3
          instructions: { uk: 'Завдання 8–11. Питання та відповіді.', en: 'Items 8–11. Questions and answers.' }
          items:
            - id: rd06
              kind: matching
              topic: rd-qa
              variant: qa
              passage: { storyId: rd-01 }
              stem: 'Доберіть до кожного питання відповідь.'
              left: ['Як вас звати?', 'Де ви живете?', 'Де ви працюєте?', 'Хто це?']
              right: ['Це моя родина.', 'Я працюю в банку.', 'Мене звати Оксана.', 'Я живу в Києві.', 'Я не знаю.']
              key: [2, 3, 1, 0]
        - id: rd-p4
          instructions: { uk: 'Завдання 12–14. Оберіть слово або форму.', en: 'Items 12–14. Word or form.' }
          items:
            - id: rd07
              kind: choice
              topic: rd-gap-word
              variant: gap-word
              passage: { storyId: rd-01, sentenceIds: [uxa1fx01r01-s02] }
              stem: 'Я … в Києві.'
              options: ['живу', 'їм', 'п’ю']
              answer: 0
            - id: rd08
              kind: choice
              topic: rd-gap-word
              variant: gap-word
              passage: { storyId: rd-01, sentenceIds: [uxa1fx01r01-s03] }
              stem: 'Я працюю в … .'
              options: ['банку', 'хлібом', 'водою']
              answer: 0
            - id: rd09
              kind: choice
              topic: rd-gap-form
              variant: gap-form
              passage: { storyId: rd-01, sentenceIds: [uxa1fx01r01-s01] }
              stem: 'Мене … Оксана.'
              options: ['звати', 'звуть', 'зову']
              answer: 0
---
Нотатки автора ігноруються.
