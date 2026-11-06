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
  id: ls-liudyna
  format: ukr-state
  level: A1
  mode: drill
  title: { uk: 'Слухання: розмова', en: 'Listening: a conversation' }
  blurb: 'Вибір А/Б/В і Правда/Неправда.'
  subtests:
    - id: listening
      kind: listening
      title: { uk: 'Слухання', en: 'Listening' }
      instructions: { uk: 'Прослухайте запис.', en: 'Listen.' }
      durationMin: 8
      dictionary: false
      navigation: linear
      pointsPerItem: 1
      maxPoints: 8
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
---
Нотатки автора ігноруються.
