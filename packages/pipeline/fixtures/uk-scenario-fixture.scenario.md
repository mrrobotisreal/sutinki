---
pack:
  id: a1-scenario-fixture-uk
  version: 1
  type: scenario
  title: { uk: 'Перевірка зв’язку', en: 'Sound Check' }
  level: A1
  tags: ['scenario', 'fixture', 'radio', 'uk']
scenario:
  id: radio-uk-a1
  familyId: radio
  title: { uk: 'Перевірка зв’язку', en: 'Sound Check' }
  level: A1
  language: uk
  brief:
    {
      uk: 'Коротка перевірка зв’язку перед ефіром.',
      en: 'A short sound check before going on air.',
    }
  startTurnId: radio-uk-a1-t01
characters:
  - id: host
    name: { uk: 'Ведучий', en: 'Host' }
    voice: 'elevenlabs:id:qNTtUpSV4C9bUAD8aUAV'
    style: radio-host
    role: host
    portrait:
      placeholder: { kind: man, hue: 25 }
    cues:
      confused: 'Puzzled and friendly: sorry, I did not catch that.'
      hint: 'Warmer and slower, the host is helping, not testing.'
  - id: player
    name: { uk: 'Ти', en: 'You' }
    voice: 'elevenlabs:id:QjEdRoRdZC2i3ncmFpNy'
    style: neutral
    role: player
scene:
  bed: studio
  layout: center
  accent: '#c26a3a'
endings:
  - id: end-ok
    title: { uk: 'Зв’язок є', en: 'Connected' }
    recap: { uk: 'Перевірку пройдено.', en: 'Sound check passed.' }
    tone: good
---

# Перевірка зв’язку — Sound Check (UT14 Piper fixture, never real content)

## radio-uk-a1-t01

SPEAKER: host

SAY:

UK: Перевірка зв'язку.
EN: Sound check.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Перевірка | перевірка | check | noun | f.sg. nom. | A2 |  |
| зв'язку | зв'язок | of the connection | noun | m.sg. gen. | B1 | перевірка зв'язку = "sound check" |
| . | | | | | | |

SAY:

UK: Раз, два, три.
EN: One, two, three.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Раз | раз | one | num | counting form | A1 |  |
| , | | | | | | |
| два | два | two | num | nom. | A1 |  |
| , | | | | | | |
| три | три | three | num | nom. | A1 |  |
| . | | | | | | |

SAY:

UK: Ти мене чуєш?
EN: Can you hear me?

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Ти | ти | you | pron | informal nom. | A1 |  |
| мене | я | me | pron | acc. | A1 |  |
| чуєш | чути | hear | verb | 2sg. pres. (impf.) | A1 |  |
| ? | | | | | | |

NEXT: radio-uk-a1-t02

## radio-uk-a1-t02

SPEAKER: host

SAY:

UK: Чудово.
EN: Great.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Чудово | чудово | great | adv | predicative | A2 |  |
| . | | | | | | |

SAY:

UK: Як тебе звати?
EN: What's your name?

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Як | як | how | adv | interrogative | A1 |  |
| тебе | ти | you | pron | acc. | A1 |  |
| звати | звати | to call | verb | inf. | A1 | як тебе звати = "what is your name" |
| ? | | | | | | |

EXPECT:
  slot name required free minTokens=1
  accept: Мене звати Мітч. | Я Мітч. | Мітч.
  reject: добре, дякую -> REACT:

UK: Ні, ім'я.
EN: No, your name.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Ні | ні | no | part |  | A1 |  |
| , | | | | | | |
| ім'я | ім'я | name | noun | n.sg. nom. | A1 |  |
| . | | | | | | |

RETRY:
  CONFUSED:

UK: Не чую.
EN: Can't hear you.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Не | не | not | part | negation | A1 |  |
| чую | чути | hear | verb | 1sg. pres. (impf.) | A1 |  |
| . | | | | | | |

  HINT:

UK: Скажи: «Мене звати…».
EN: Say: "My name is…".

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Скажи | сказати | say | verb | imper. 2sg. (pf.) | A1 |  |
| : | | | | | | |
| « | | | | | | |
| Мене | я | me | pron | acc. | A1 |  |
| звати | звати | to call | verb | inf. | A1 |  |
| … | | | | | | |
| » | | | | | | |
| . | | | | | | |

  SECOND:

UK: Наприклад: «Мене звати Мітч».
EN: For example: "My name is Mitch."

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Наприклад | наприклад | for example | adv |  | A2 |  |
| : | | | | | | |
| « | | | | | | |
| Мене | я | me | pron | acc. | A1 |  |
| звати | звати | to call | verb | inf. | A1 |  |
| Мітч | Мітч | Mitch | noun | name | A1 |  |
| » | | | | | | |
| . | | | | | | |

  LIFELINE: «Мене звати …». | "Мене звати …" (My name is …).

NEXT: radio-uk-a1-t03

## radio-uk-a1-t03

SPEAKER: host

SAY:

UK: Ти любиш каву?
EN: Do you like coffee?

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Ти | ти | you | pron | informal nom. | A1 |  |
| любиш | любити | like | verb | 2sg. pres. (impf.) | A1 |  |
| каву | кава | coffee | noun | f.sg. acc. | A1 |  |
| ? | | | | | | |

EXPECT:
  slot love required forms: yes=так: так, люблю, обожнюю | no=ні: ні, не люблю, не дуже
  accept: Так, люблю. | Ні, не люблю. | Не дуже.
  branchOn: love

RETRY:
  CONFUSED:

UK: Каву. Любиш чи ні?
EN: Coffee. Do you like it or not?

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Каву | кава | coffee | noun | f.sg. acc. | A1 |  |
| . | | | | | | |
| Любиш | любити | like | verb | 2sg. pres. (impf.) | A1 |  |
| чи | чи | or | conj |  | A1 |  |
| ні | ні | no | part |  | A1 |  |
| ? | | | | | | |

  HINT:

UK: Скажи «так» або «ні».
EN: Say "yes" or "no".

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Скажи | сказати | say | verb | imper. 2sg. (pf.) | A1 |  |
| « | | | | | | |
| так | так | yes | part |  | A1 |  |
| » | | | | | | |
| або | або | or | conj |  | A1 |  |
| « | | | | | | |
| ні | ні | no | part |  | A1 |  |
| » | | | | | | |
| . | | | | | | |

  LIFELINE: «Так, люблю» / «Ні, не люблю». | "Так, люблю" (Yes, I like it) / "Ні, не люблю" (No, I don't).

NEXT: on yes=radio-uk-a1-t04y no=radio-uk-a1-t04n default=radio-uk-a1-t04d

## radio-uk-a1-t04y

SPEAKER: host

SAY:

UK: Добре.
EN: Good.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Добре | добре | good | adv | predicative | A1 |  |
| . | | | | | | |

SAY:

UK: Я теж люблю каву.
EN: I like coffee too.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Я | я | I | pron | nom. | A1 |  |
| теж | теж | too | adv |  | A1 |  |
| люблю | любити | like | verb | 1sg. pres. (impf.) | A1 |  |
| каву | кава | coffee | noun | f.sg. acc. | A1 |  |
| . | | | | | | |

SAY:

UK: До ефіру!
EN: See you on air!

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| До | до | until | prep | +gen. | A1 |  |
| ефіру | ефір | air (broadcast) | noun | m.sg. gen. | A2 |  |
| ! | | | | | | |

ENDING: end-ok

## radio-uk-a1-t04n

SPEAKER: host

SAY:

UK: Розумію.
EN: I understand.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Розумію | розуміти | understand | verb | 1sg. pres. (impf.) | A1 |  |
| . | | | | | | |

SAY:

UK: Тоді чай.
EN: Then tea.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Тоді | тоді | then | adv |  | A1 |  |
| чай | чай | tea | noun | m.sg. nom. | A1 |  |
| . | | | | | | |

SAY:

UK: До ефіру!
EN: See you on air!

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| До | до | until | prep | +gen. | A1 |  |
| ефіру | ефір | air (broadcast) | noun | m.sg. gen. | A2 |  |
| ! | | | | | | |

ENDING: end-ok

## radio-uk-a1-t04d

SPEAKER: host

SAY:

UK: Ясно.
EN: I see.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Ясно | ясно | clear | adv | predicative | A1 |  |
| . | | | | | | |

SAY:

UK: До ефіру!
EN: See you on air!

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| До | до | until | prep | +gen. | A1 |  |
| ефіру | ефір | air (broadcast) | noun | m.sg. gen. | A2 |  |
| ! | | | | | | |

ENDING: end-ok

## glossary

### перевірка | check | forms: перевірка, перевірк* | translit: чек

EXPLAIN:

UK: Перевірка — це check.
EN: «перевірка» means check.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Перевірка | перевірка | check | noun | f.sg. nom. | A2 |  |
| — | | | | | | |
| це | це | this is | pron |  | A1 |  |
| check | check | check | noun |  | A1 |  |
| . | | | | | | |

HOWTOSAY:

UK: Check — українською «перевірка».
EN: Check is «перевірка» in Ukrainian.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Check | check | check | noun |  | A1 |  |
| — | | | | | | |
| українською | українською | in Ukrainian | adv |  | A1 |  |
| « | | | | | | |
| перевірка | перевірка | check | noun | f.sg. nom. | A2 |  |
| » | | | | | | |
| . | | | | | | |

### зв'язок | connection | forms: зв'язок, зв'язку, зв'яз*

EXPLAIN:

UK: Зв'язок — це connection.
EN: «зв'язок» means connection.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Зв'язок | зв'язок | connection | noun | m.sg. nom. | B1 |  |
| — | | | | | | |
| це | це | this is | pron |  | A1 |  |
| connection | connection | connection | noun |  | A1 |  |
| . | | | | | | |

HOWTOSAY:

UK: Connection — українською «зв'язок».
EN: Connection is «зв'язок» in Ukrainian.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Connection | connection | connection | noun |  | A1 |  |
| — | | | | | | |
| українською | українською | in Ukrainian | adv |  | A1 |  |
| « | | | | | | |
| зв'язок | зв'язок | connection | noun | m.sg. nom. | B1 |  |
| » | | | | | | |
| . | | | | | | |

### кава | coffee | forms: кава, каву, кав*

EXPLAIN:

UK: Кава — це coffee.
EN: «кава» means coffee.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Кава | кава | coffee | noun | f.sg. nom. | A1 |  |
| — | | | | | | |
| це | це | this is | pron |  | A1 |  |
| coffee | coffee | coffee | noun |  | A1 |  |
| . | | | | | | |

HOWTOSAY:

UK: Coffee — українською «кава».
EN: Coffee is «кава» in Ukrainian.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Coffee | coffee | coffee | noun |  | A1 |  |
| — | | | | | | |
| українською | українською | in Ukrainian | adv |  | A1 |  |
| « | | | | | | |
| кава | кава | coffee | noun | f.sg. nom. | A1 |  |
| » | | | | | | |
| . | | | | | | |

### чути | to hear | forms: чути, чуєш, чу* | translit: хір, то хір

EXPLAIN:

UK: Чути — це to hear.
EN: «чути» means to hear.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Чути | чути | to hear | verb | inf. | A1 |  |
| — | | | | | | |
| це | це | this is | pron |  | A1 |  |
| to | to | to | part |  | A1 |  |
| hear | hear | hear | verb |  | A1 |  |
| . | | | | | | |

HOWTOSAY:

UK: To hear — українською «чути».
EN: To hear is «чути» in Ukrainian.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| To | to | to | part |  | A1 |  |
| hear | hear | hear | verb |  | A1 |  |
| — | | | | | | |
| українською | українською | in Ukrainian | adv |  | A1 |  |
| « | | | | | | |
| чути | чути | to hear | verb | inf. | A1 |  |
| » | | | | | | |
| . | | | | | | |

## nudges

### silence

UK: Ти тут?
EN: Are you there?

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Ти | ти | you | pron |  | A1 |  |
| тут | тут | here | adv |  | A1 |  |
| ? | | | | | | |

### which-word

UK: Яке слово?
EN: Which word?

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Яке | який | which | pron |  | A1 |  |
| слово | слово | word | noun | n.sg. nom. | A1 |  |
| ? | | | | | | |

### dont-know

UK: Не знаю цього слова.
EN: I don't know that word.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Не | не | not | part |  | A1 |  |
| знаю | знати | know | verb | 1sg. pres. (impf.) | A1 |  |
| цього | цей | this | pron | gen. | A1 |  |
| слова | слово | word | noun | n.sg. gen. | A1 |  |
| . | | | | | | |

