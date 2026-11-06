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
  id: x-match
  format: ukr-state
  level: A1
  mode: drill
  title: { uk: 'Зламано', en: 'Broken' }
  subtests:
    - id: s1
      kind: reading
      title: { uk: 'Тест', en: 'Test' }
      instructions: { uk: 'Тест.', en: 'Test.' }
      durationMin: 10
      dictionary: false
      navigation: free
      pointsPerItem: 1
      maxPoints: 3
      parts:
        - id: p1
          instructions: { uk: 'Тест.', en: 'Test.' }
          items:
            - id: rd01
              kind: matching
              topic: rd-qa
              stem: 'Доберіть відповідь.'
              left: ['Як вас звати?', 'Де ви живете?', 'Де ви працюєте?']
              right: ['Мене звати Оксана.', 'Я живу в Києві.', 'Я працюю в банку.']
              key: [0, 1, 1]
---

Зламана фікстура UT16 — анотувати разом з ../ukr-exam-fixture/rd-01.draft.md і
ls-01.draft.md (див. test/exam.test.ts).
