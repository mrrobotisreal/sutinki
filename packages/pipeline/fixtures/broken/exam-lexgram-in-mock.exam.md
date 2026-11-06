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
  id: x-lexmock
  format: ukr-state
  level: A1
  mode: mock
  title: { uk: 'Зламано', en: 'Broken' }
  subtests:
    - id: s1
      kind: lexgram
      title: { uk: 'Тест', en: 'Test' }
      instructions: { uk: 'Тест.', en: 'Test.' }
      durationMin: 10
      dictionary: false
      navigation: free
      pointsPerItem: 1
      maxPoints: 1
      parts:
        - id: p1
          instructions: { uk: 'Тест.', en: 'Test.' }
          items:
            - { id: lg01, kind: choice, topic: g19, stem: 'Я живу … Києві.', options: ['в', 'на'], answer: 0 }
---

Зламана фікстура UT16 — анотувати разом з ../ukr-exam-fixture/rd-01.draft.md і
ls-01.draft.md (див. test/exam.test.ts).
