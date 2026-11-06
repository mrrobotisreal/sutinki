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
  id: sp-photo
  format: ukr-state
  level: A1
  mode: drill
  title: { uk: 'Говоріння: фото', en: 'Speaking: photo' }
  blurb: 'Опишіть фото (5 фраз).'
  subtests:
    - id: speaking
      kind: speaking
      title: { uk: 'Говоріння', en: 'Speaking' }
      instructions: { uk: 'Опишіть фото.', en: 'Describe the photo.' }
      durationMin: 5
      dictionary: false
      navigation: linear
      maxPoints: 38
      parts:
        - id: sp-p1
          instructions: { uk: 'Завдання 46.', en: 'Task 46.' }
          timeSec: 300
          items:
            - id: sp01
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
---
Нотатки автора ігноруються.
