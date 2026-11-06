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
  id: wr-message
  format: ukr-state
  level: A1
  mode: drill
  title: { uk: 'Письмо: записка', en: 'Writing: a note' }
  blurb: 'Коротка записка (10–25 слів).'
  subtests:
    - id: writing
      kind: writing
      title: { uk: 'Письмо', en: 'Writing' }
      instructions: { uk: 'Напишіть записку.', en: 'Write a note.' }
      durationMin: 8
      dictionary: false
      navigation: free
      maxPoints: 33
      parts:
        - id: wr-p1
          instructions: { uk: 'Завдання 44.', en: 'Task 44.' }
          items:
            - id: wr01
              kind: writing
              topic: wr-message
              task: { uk: 'Напишіть другові записку про себе.', en: 'Write a friend a note about yourself.' }
              bullets:
                - { id: b1, text: { uk: 'хто ви', en: 'who you are' }, cues: ['мене'] }
                - { id: b2, text: { uk: 'де ви живете', en: 'where you live' }, cues: ['живу'] }
              minSentences: 1
              minWords: 10
              maxWords: 25
---
Нотатки автора ігноруються.
