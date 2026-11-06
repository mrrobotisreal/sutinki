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
  id: lg-g19
  format: ukr-state
  level: A1
  mode: drill
  title: { uk: 'Місцевий відмінок', en: 'Locative case' }
  blurb: 'Де? в / на + місцевий відмінок — шість вправ.'
  subtests:
    - id: lexgram
      kind: lexgram
      title: { uk: 'Лексика. Граматика', en: 'Vocabulary. Grammar' }
      instructions: { uk: 'Оберіть одну відповідь.', en: 'Choose one answer.' }
      durationMin: 6
      dictionary: false
      navigation: free
      pointsPerItem: 1
      maxPoints: 4
      parts:
        - id: p1
          instructions: { uk: 'Завдання 1–3.', en: 'Items 1–3.' }
          items:
            - id: lg01
              kind: choice
              topic: g19
              stem: 'Я живу в … .'
              options: ['Київ', 'Києві', 'Києвом']
              answer: 1
              explain: 'Де? в + місцевий: Київ → у Києві.'
            - id: lg02
              kind: choice
              topic: g19
              stem: 'Оксана працює на … .'
              options: ['пошта', 'пошті', 'пошту']
              answer: 1
              explain: 'на пошті — «на» + місцевий.'
            - id: lg03
              kind: choice
              topic: g19
              stem: 'Ми були в … .'
              options: ['школа', 'школі', 'школу']
              answer: 1
        - id: p2
          instructions: { uk: 'Завдання 4.', en: 'Item 4.' }
          items:
            - id: lg04
              kind: typed
              topic: g19
              prompt: 'Тарас у (парк).'
              accept: ['парку', 'парці']
              half: ['парк']
              explain: 'У парку — закінчення -у.'
---
Нотатки автора ігноруються.
