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
  id: x-kind
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
      maxPoints: 4
      parts:
        - id: p1
          instructions: { uk: 'Тест.', en: 'Test.' }
          items:
            - { id: rd01, kind: choice, topic: rd-detail, stem: 'Оксана живе в …', options: ['Києві', 'Львові'], answer: 0, points: 4 }
            - id: sp01
              kind: speaking-reply
              topic: sp-dialogue
              prompt: { storyId: ls-01, sentenceIds: [uxa1fx01l01-s01] }
              expect: { slots: [{ kind: free, id: a, required: true }], accept: ['Я в Києві.'] }
---

Зламана фікстура UT16 — анотувати разом з ../ukr-exam-fixture/rd-01.draft.md і
ls-01.draft.md (див. test/exam.test.ts).
