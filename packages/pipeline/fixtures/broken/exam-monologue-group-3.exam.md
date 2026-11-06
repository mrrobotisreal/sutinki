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
  id: x-group
  format: torfl
  level: A1
  mode: drill
  title: { uk: 'Сломано', en: 'Broken' }
  subtests:
    - id: s1
      kind: speaking
      title: { uk: 'Тест', en: 'Test' }
      instructions: { uk: 'Тест.', en: 'Test.' }
      durationMin: 10
      dictionary: false
      navigation: free
      maxPoints: 100
      parts:
        - id: p1
          instructions: { uk: 'Тест.', en: 'Test.' }
          items:
            - id: sp01
              kind: speaking-monologue
              topic: speak-monologue
              group: m1
              topicTitle: { uk: 'Тема 1', en: 'Topic 1' }
              questions:
                - { uk: 'Как вас зовут?', cues: ['зовут'] }
                - { uk: 'Откуда вы?', cues: ['из'] }
                - { uk: 'Где вы живёте?', cues: ['живу'] }
                - { uk: 'Что вы любите?', cues: ['люблю'] }
            - id: sp02
              kind: speaking-monologue
              topic: speak-monologue
              group: m1
              topicTitle: { uk: 'Тема 2', en: 'Topic 2' }
              questions:
                - { uk: 'Как вас зовут?', cues: ['зовут'] }
                - { uk: 'Откуда вы?', cues: ['из'] }
                - { uk: 'Где вы живёте?', cues: ['живу'] }
                - { uk: 'Что вы любите?', cues: ['люблю'] }
            - id: sp03
              kind: speaking-monologue
              topic: speak-monologue
              group: m1
              topicTitle: { uk: 'Тема 3', en: 'Topic 3' }
              questions:
                - { uk: 'Как вас зовут?', cues: ['зовут'] }
                - { uk: 'Откуда вы?', cues: ['из'] }
                - { uk: 'Где вы живёте?', cues: ['живу'] }
                - { uk: 'Что вы любите?', cues: ['люблю'] }
---

T67 broken fixture — annotate together with ../exam-fixture/rd-01.draft.md and
ls-01.draft.md (see test/exam.test.ts).
