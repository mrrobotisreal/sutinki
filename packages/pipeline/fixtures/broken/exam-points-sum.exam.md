---
pack:
  id: a1-exam-fixture
  version: 1
  type: exam
  title: { uk: "ТРКИ: тестовый пакет", en: "TORFL: fixture pack" }
  level: A1
  tags: ["torfl", "torfl:fixture"]
  category: torfl
exam:
  id: x-points
  format: torfl
  level: A1
  mode: drill
  title: { uk: 'Сломано', en: 'Broken' }
  subtests:
    - id: s1
      kind: lexgram
      title: { uk: 'Тест', en: 'Test' }
      instructions: { uk: 'Тест.', en: 'Test.' }
      durationMin: 10
      dictionary: false
      navigation: free
      pointsPerItem: 1
      maxPoints: 70
      parts:
        - id: p1
          instructions: { uk: 'Тест.', en: 'Test.' }
          items:
            - { id: lg01, kind: choice, topic: case-prep, stem: 'Я живу … Москве.', options: ['в', 'на'], answer: 0 }
            - { id: lg02, kind: choice, topic: case-prep, stem: 'Я работаю … почте.', options: ['в', 'на'], answer: 1 }
---

T67 broken fixture — annotate together with ../exam-fixture/rd-01.draft.md and
ls-01.draft.md (see test/exam.test.ts).
