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
  id: a1-mock-fx
  format: ukr-state
  level: A1
  mode: mock
  title: { uk: 'Зразок A1 (тест)', en: 'Fixture mock A1' }
  subtests:
    - id: ls
      kind: listening
      title: { uk: 'Слухання', en: 'Listening' }
      instructions: { uk: 'Час виконання — 8 хвилин.', en: '8 minutes.' }
      durationMin: 8
      dictionary: false
      navigation: linear
      pointsPerItem: 1
      maxPoints: 8
      audioPlays: 2
      parts:
        - id: ls-p1
          instructions: { uk: 'Прослухайте запис. Оберіть правильну відповідь (А, Б або В). Ви прослухаєте кожен запис двічі.', en: 'Listen. Choose the correct answer (A, B or C). You hear each recording twice.' }
          items:
            - id: ls01
              kind: choice
              topic: ls-mc3
              audio: { storyId: ls-01 }
              stem: 'Тарас і Оксана говорять про…'
              options: ['дім', 'роботу', 'погоду']
              answer: 0
            - id: ls02
              kind: choice
              topic: ls-mc3
              stem: 'Де зараз Оксана?'
              options: ['вдома', 'на роботі', 'у Києві']
              answer: 0
            - id: ls03
              kind: choice
              topic: ls-mc3
              stem: 'Хто говорить першим?'
              options: ['Тарас', 'Оксана', 'екзаменатор']
              answer: 0
            - id: ls04
              kind: choice
              topic: ls-mc3
              stem: 'Що Оксана робить сьогодні?'
              options: ['відпочиває', 'працює', 'вчиться']
              answer: 0
        - id: ls-p2
          instructions: { uk: 'Прослухайте запис. Оберіть: Правда чи Неправда. Ви прослухаєте кожен запис двічі.', en: 'Listen. True or false. You hear each recording twice.' }
          items:
            - id: ls05
              kind: choice
              topic: ls-tf
              variant: true-false
              audio: { storyId: ls-01 }
              stem: 'Оксана зараз удома.'
              options: ['Правда', 'Неправда']
              answer: 0
            - id: ls06
              kind: choice
              topic: ls-tf
              variant: true-false
              stem: 'Тарас питає про роботу.'
              options: ['Правда', 'Неправда']
              answer: 0
            - id: ls07
              kind: choice
              topic: ls-tf
              variant: true-false
              stem: 'Оксана сьогодні працює.'
              options: ['Правда', 'Неправда']
              answer: 1
            - id: ls08
              kind: choice
              topic: ls-tf
              variant: true-false
              stem: 'Вони говорять уранці.'
              options: ['Правда', 'Неправда']
              answer: 1
    - id: rd
      kind: reading
      title: { uk: 'Читання', en: 'Reading' }
      instructions: { uk: 'Час виконання — 30 хвилин.', en: '30 minutes.' }
      durationMin: 30
      dictionary: false
      navigation: free
      pointsPerItem: 1
      maxPoints: 16
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
        - id: rd-p5
          instructions: { uk: 'Завдання 15–16. Оберіть одну відповідь.', en: 'Items 15–16. Choose one answer.' }
          items:
            - id: rd10
              kind: choice
              topic: rd-detail
              passage: { storyId: rd-01, sentenceIds: [uxa1fx01r01-s03] }
              stem: 'Де працює Оксана?'
              options: ['у школі', 'у банку', 'у крамниці', 'у лікарні']
              answer: 1
            - id: rd11
              kind: choice
              topic: rd-detail
              passage: { storyId: rd-01 }
              stem: 'Що це за текст?'
              options: ['розповідь про себе', 'оголошення', 'меню', 'розклад']
              answer: 0
    - id: wr
      kind: writing
      title: { uk: 'Письмо', en: 'Writing' }
      instructions: { uk: 'Час виконання — 20 хвилин.', en: '20 minutes.' }
      durationMin: 20
      dictionary: false
      navigation: free
      maxPoints: 33
      parts:
        - id: wr-p1
          instructions: { uk: 'Завдання 44. Напишіть коротку записку.', en: 'Task 44. Write a short note.' }
          timeSec: 480
          items:
            - id: wr44
              kind: writing
              topic: wr-message
              task: { uk: 'Напишіть другові записку про себе.', en: 'Write a friend a note about yourself.' }
              bullets:
                - { id: b1, text: { uk: 'хто ви', en: 'who you are' }, cues: ['мене'] }
                - { id: b2, text: { uk: 'де ви живете', en: 'where you live' }, cues: ['живу'] }
              minSentences: 1
              minWords: 10
              maxWords: 25
        - id: wr-p2
          instructions: { uk: 'Завдання 45. Напишіть текст про себе.', en: 'Task 45. Write a text about yourself.' }
          timeSec: 720
          items:
            - id: wr45
              kind: writing
              topic: wr-text
              task: { uk: 'Напишіть текст про себе та свою родину.', en: 'Write a text about yourself and your family.' }
              bullets:
                - { id: b1, text: { uk: 'хто ви', en: 'who you are' }, cues: ['мене'] }
                - { id: b2, text: { uk: 'де ви живете', en: 'where you live' }, cues: ['живу'] }
              minSentences: 3
              minWords: 30
              maxWords: 50
    - id: sp
      kind: speaking
      title: { uk: 'Говоріння', en: 'Speaking' }
      instructions: { uk: 'Час виконання — 18 хвилин.', en: '18 minutes.' }
      durationMin: 18
      dictionary: false
      navigation: linear
      maxPoints: 38
      parts:
        - id: sp-p1
          instructions: { uk: 'Завдання 46. Опишіть фото.', en: 'Task 46. Describe the photo.' }
          timeSec: 300
          items:
            - id: sp44
              kind: speaking-monologue
              topic: sp-photo
              topicTitle: { uk: 'Фото: родина в парку', en: 'Photo: a family in the park' }
              questions:
                - { uk: 'Хто на фото?', cues: ['люди'] }
                - { uk: 'Де вони?', cues: ['парк'] }
                - { uk: 'Що вони роблять?', cues: ['гуляють'] }
                - { uk: 'Який настрій?', cues: ['радість'] }
              minSentences: 5
              maxSentences: 7
              image: { file: images/photo-01.png, alt: 'Родина гуляє в парку' }
        - id: sp-p2
          instructions: { uk: 'Завдання 47. Розкажіть про себе.', en: 'Task 47. Tell about yourself.' }
          timeSec: 480
          items:
            - id: sp45
              kind: speaking-monologue
              topic: sp-monologue
              topicTitle: { uk: 'Про себе', en: 'About myself' }
              questions:
                - { uk: 'Як вас звати?', cues: ['звати'] }
                - { uk: 'Де ви живете?', cues: ['живу'] }
                - { uk: 'Що ви любите робити?', cues: ['люблю'] }
                - { uk: 'Де ви працюєте?', cues: ['працюю'] }
              minSentences: 8
              maxSentences: 10
        - id: sp-p3
          instructions: { uk: 'Завдання 48. Дайте відповіді.', en: 'Task 48. Answer.' }
          timeSec: 300
          items:
            - id: sp46
              kind: speaking-reply
              topic: sp-dialogue
              prompt: { storyId: ex-01, sentenceIds: [uxa1fx01e01-s01] }
              expect:
                slots: [{ kind: free, id: a1, required: true, minTokens: 2, cues: ['звати'] }]
                accept: ['Мене звати Оксана.']
            - id: sp47
              kind: speaking-reply
              topic: sp-dialogue
              prompt: { storyId: ex-01, sentenceIds: [uxa1fx01e01-s02] }
              expect:
                slots: [{ kind: free, id: a2, required: true, minTokens: 2, cues: ['живу'] }]
                accept: ['Я живу в Києві.']
            - id: sp48
              kind: speaking-reply
              topic: sp-dialogue
              prompt: { storyId: ex-01, sentenceIds: [uxa1fx01e01-s03] }
              expect:
                slots: [{ kind: free, id: a3, required: true, minTokens: 2, cues: ['люблю'] }]
                accept: ['Я люблю читати.']
---
Нотатки автора ігноруються.
