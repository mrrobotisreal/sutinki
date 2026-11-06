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
  id: x-group
  format: ukr-state
  level: A1
  mode: drill
  title: { uk: 'Зламано', en: 'Broken' }
  subtests:
    - id: s1
      kind: speaking
      title: { uk: 'Тест', en: 'Test' }
      instructions: { uk: 'Тест.', en: 'Test.' }
      durationMin: 10
      dictionary: false
      navigation: free
      maxPoints: 38
      parts:
        - id: p1
          instructions: { uk: 'Тест.', en: 'Test.' }
          items:
            - id: sp01
              kind: speaking-monologue
              topic: sp-monologue
              group: m1
              topicTitle: { uk: 'Тема 1', en: 'Тема 1' }
              questions:
                - { uk: 'Як вас звати?', cues: ['звати'] }
                - { uk: 'Де ви живете?', cues: ['живу'] }
                - { uk: 'Що ви любите?', cues: ['люблю'] }
                - { uk: 'Де ви працюєте?', cues: ['працюю'] }
            - id: sp02
              kind: speaking-monologue
              topic: sp-monologue
              group: m1
              topicTitle: { uk: 'Тема 2', en: 'Тема 2' }
              questions:
                - { uk: 'Як вас звати?', cues: ['звати'] }
                - { uk: 'Де ви живете?', cues: ['живу'] }
                - { uk: 'Що ви любите?', cues: ['люблю'] }
                - { uk: 'Де ви працюєте?', cues: ['працюю'] }
            - id: sp03
              kind: speaking-monologue
              topic: sp-monologue
              group: m1
              topicTitle: { uk: 'Тема 3', en: 'Тема 3' }
              questions:
                - { uk: 'Як вас звати?', cues: ['звати'] }
                - { uk: 'Де ви живете?', cues: ['живу'] }
                - { uk: 'Що ви любите?', cues: ['люблю'] }
                - { uk: 'Де ви працюєте?', cues: ['працюю'] }
---

Зламана фікстура UT16 — анотувати разом з ../ukr-exam-fixture/rd-01.draft.md і
ls-01.draft.md (див. test/exam.test.ts).
