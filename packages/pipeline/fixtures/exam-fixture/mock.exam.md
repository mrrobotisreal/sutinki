---
exam:
  id: a1-mock-fx
  format: torfl
  level: A1
  mode: mock
  title: { uk: 'Вариант ФХ', en: 'Fixture mock' }
  subtests:
    - id: writing
      kind: writing
      title: { uk: 'Письмо', en: 'Writing' }
      instructions: { uk: 'Время выполнения — 30 минут. Можно пользоваться словарём.', en: '30 minutes · dictionary allowed.' }
      durationMin: 30
      dictionary: true
      navigation: free
      maxPoints: 100
      parts:
        - id: p1
          instructions: { uk: 'Напишите письмо другу.', en: 'Write a letter to a friend.' }
          items:
            - id: wr01
              kind: writing
              topic: write-letter
              task: { uk: 'Ваш друг хочет знать о вашей жизни. Напишите ему письмо.', en: 'Your friend wants to know about your life. Write them a letter.' }
              bullets:
                - { id: b1, text: { uk: 'как вас зовут', en: 'your name' }, cues: ['зовут'] }
                - { id: b2, text: { uk: 'где вы живёте', en: 'where you live' }, cues: ['живу', 'живём'] }
                - { id: b3, text: { uk: 'где вы работаете', en: 'where you work' }, cues: ['работа*'] }
                - { id: b4, text: { uk: 'что вы любите делать', en: 'what you like doing' }, cues: ['люблю', 'нравится'] }
              minSentences: 10
              minQuestions: 2
              maxQuestions: 5
    - id: lexgram
      kind: lexgram
      title: { uk: 'Лексика. Грамматика', en: 'Vocabulary. Grammar' }
      instructions: { uk: 'Время выполнения — 40 минут. Пользоваться словарём нельзя.', en: '40 minutes · no dictionary.' }
      durationMin: 40
      dictionary: false
      navigation: free
      pointsPerItem: 1
      maxPoints: 5
      parts:
        - id: p1
          instructions: { uk: 'Задания 1–3. Выберите один вариант ответа.', en: 'Items 1–3. Choose one answer.' }
          items:
            - { id: lg01, kind: choice, topic: case-prep, stem: 'Нина любит играть … компьютере.', options: ['в', 'на'], answer: 1 }
            - { id: lg02, kind: choice, topic: lex-verbs, stem: 'Я … по-русски.', options: ['говорю', 'рассказываю', 'спрашиваю'], answer: 0 }
            - { id: lg03, kind: choice, topic: case-gen, stem: 'У меня нет …', options: ['брат', 'брата', 'брату', 'братом'], answer: 1 }
        - id: p5
          instructions: { uk: 'Задания 4–5. Выберите один вариант ответа.', en: 'Items 4–5. Choose one answer.' }
          items:
            - { id: lg04, kind: choice, topic: verb-motion, stem: 'Вчера мы … в театр.', options: ['шли', 'ходили', 'идём'], answer: 1 }
            - { id: lg05, kind: choice, topic: conj, stem: 'Я не пришёл, … был болен.', options: ['поэтому', 'потому что'], answer: 1 }
    - id: reading
      kind: reading
      title: { uk: 'Чтение', en: 'Reading' }
      instructions: { uk: 'Время выполнения — 40 минут. Можно пользоваться словарём.', en: '40 minutes · dictionary allowed.' }
      durationMin: 40
      dictionary: true
      navigation: free
      pointsPerItem: 4
      maxPoints: 12
      parts:
        - id: p4
          instructions: { uk: 'Задания 1–3. Прочитайте текст. Выберите один вариант ответа.', en: 'Items 1–3. Read the text. Choose one answer.' }
          items:
            - { id: rd01, kind: choice, topic: read-detail, passage: { storyId: rd-01, sentenceIds: [tfa1fx01r01-s01, tfa1fx01r01-s02] }, stem: 'Анна живёт в …', options: ['Москве', 'Казани', 'Сочи'], answer: 0 }
            - { id: rd02, kind: choice, topic: read-detail, passage: { storyId: rd-01 }, stem: 'Анна работает в …', options: ['школе', 'банке', 'магазине'], answer: 1 }
            - { id: rd03, kind: choice, topic: read-detail, passage: { storyId: rd-01, sentenceIds: [tfa1fx01r01-s05] }, stem: 'Утром Анна идёт на работу …', options: ['пешком', 'на метро', 'на автобусе'], answer: 0 }
    - id: listening
      kind: listening
      title: { uk: 'Аудирование', en: 'Listening' }
      instructions: { uk: 'Время выполнения — 30 минут. Каждый текст звучит два раза.', en: '30 minutes · every text plays twice.' }
      durationMin: 30
      dictionary: false
      navigation: linear
      pointsPerItem: 5
      maxPoints: 15
      audioPlays: 2
      parts:
        - id: p3
          instructions: { uk: 'Задания 1–3. Прослушайте диалог Маши и Саши. Выберите один вариант ответа.', en: 'Items 1–3. Listen to Masha and Sasha. Choose one answer.' }
          items:
            - { id: ls01, kind: choice, topic: listen-detail, audio: { storyId: ls-01 }, stem: 'Саша сейчас в …', options: ['Москве', 'Екатеринбурге', 'Санкт-Петербурге'], answer: 1 }
            - { id: ls02, kind: choice, topic: listen-detail, stem: 'Саша в Екатеринбурге …', options: ['работает', 'учится', 'отдыхает'], answer: 1 }
            - { id: ls03, kind: choice, topic: listen-who, stem: 'Маша и Саша — …', options: ['друзья', 'отец и дочь', 'врач и пациент'], answer: 0 }
    - id: speaking
      kind: speaking
      title: { uk: 'Говорение', en: 'Speaking' }
      instructions: { uk: 'Время выполнения — 20 минут.', en: '20 minutes.' }
      durationMin: 20
      dictionary: false
      navigation: linear
      maxPoints: 100
      parts:
        - id: t1
          instructions: { uk: 'Задание 1. Ответьте на вопросы.', en: 'Task 1. Answer the questions.' }
          timeSec: 300
          items:
            - id: sp01
              kind: speaking-reply
              topic: speak-reply
              prompt: { storyId: ls-01, sentenceIds: [tfa1fx01l01-s01] }
              expect:
                slots:
                  - kind: forms
                    id: city
                    required: true
                    options: [{ key: city, lemma: 'город', forms: ['москв*', 'казан*', 'екатеринбург*'] }]
                accept: ['Я сейчас в Москве.']
        - id: t2
          instructions: { uk: 'Задание 2. Начните диалог.', en: 'Task 2. Start the dialogue.' }
          timeSec: 300
          items:
            - id: sp02
              kind: speaking-situation
              topic: speak-situation
              prompt: { storyId: ls-01, sentenceIds: [tfa1fx01l01-s03] }
              situation: { uk: 'Вы хотите узнать, где работает ваш друг. Спросите его.', en: 'You want to know where your friend works. Ask them.' }
              expect:
                slots:
                  - { kind: free, id: question, required: true, minTokens: 2, cues: ['где', 'работаешь'] }
                accept: ['Где ты работаешь?']
        - id: t3
          instructions: { uk: 'Задание 3. Выберите тему и расскажите.', en: 'Task 3. Choose a topic and talk about it.' }
          timeSec: 600
          items:
            - id: sp03
              kind: speaking-monologue
              topic: speak-monologue
              group: m1
              topicTitle: { uk: 'О себе', en: 'About myself' }
              questions:
                - { uk: 'Как вас зовут?', cues: ['зовут'] }
                - { uk: 'Откуда вы?', cues: ['из'] }
                - { uk: 'Где вы живёте?', cues: ['живу'] }
                - { uk: 'Что вы любите делать?', cues: ['люблю', 'нравится'] }
            - id: sp04
              kind: speaking-monologue
              topic: speak-monologue
              group: m1
              topicTitle: { uk: 'Мой дом', en: 'My home' }
              questions:
                - { uk: 'Где ваш дом?', cues: ['дом'] }
                - { uk: 'Какая у вас квартира?', cues: ['квартир*'] }
                - { uk: 'Сколько в ней комнат?', cues: ['комнат*'] }
                - { uk: 'Что вам нравится в доме?', cues: ['нравится'] }
---

T67 fixture mock — mock-SHAPED (all five subtests in the official SPbU order)
but deliberately NOT official-shape: 2–3 items per objective part, so
`validate` prints `⚠ official-shape:` lines. The body of an exam draft is
author notes; annotate ignores it.
