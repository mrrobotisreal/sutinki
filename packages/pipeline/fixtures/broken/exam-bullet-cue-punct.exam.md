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
  id: x-cue
  format: ukr-state
  level: A1
  mode: drill
  title: { uk: 'Зламано', en: 'Broken' }
  subtests:
    - id: s1
      kind: writing
      title: { uk: 'Тест', en: 'Test' }
      instructions: { uk: 'Тест.', en: 'Test.' }
      durationMin: 10
      dictionary: false
      navigation: free
      maxPoints: 33
      parts:
        - id: p1
          instructions: { uk: 'Тест.', en: 'Test.' }
          items:
            - id: wr01
              kind: writing
              topic: wr-text
              task: { uk: 'Напишіть текст про себе.', en: 'Write about yourself.' }
              bullets:
                - { id: b1, text: { uk: 'як вас звати', en: 'your name' }, cues: ['звати'] }
                - { id: b2, text: { uk: 'де ви живете', en: 'where you live' }, cues: ['живу!'] }
              minSentences: 3
---

Зламана фікстура UT16 — анотувати разом з ../ukr-exam-fixture/rd-01.draft.md і
ls-01.draft.md (див. test/exam.test.ts).
