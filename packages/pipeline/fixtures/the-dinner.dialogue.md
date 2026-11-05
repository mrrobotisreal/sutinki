---
pack:
  id: a2-dialogue-001
  version: 1
  type: dialogue
  title: { uk: 'Вечеря в мами', en: "Dinner at Mama's" }
  level: A2
  tags: ['dialogue', 'family']
dialogue:
  id: dinner-mini
  title: { uk: 'Вечеря в мами', en: "Dinner at Mama's" }
  level: A2
  startNodeId: din-n01
characters:
  - id: mama
    name: { uk: 'Мама', en: 'Mama' }
    voice: elevenlabs:Mariia
    style: warm
    audioTag: '[warm]'
  - id: babushka
    name: { uk: 'Бабуся', en: 'Grandmother' }
    voice: elevenlabs:Kate
    style: gentle
    audioTag: '[gentle]'
  - id: player
    name: { uk: 'Ти', en: 'You' }
    voice: elevenlabs:Ivan
    style: neutral
endings:
  - id: end-good
    title: { uk: 'Чудове враження', en: 'A great impression' }
    recap:
      {
        uk: 'Ти добре поїв, похвалив борщ, і бабуся тобою задоволена.',
        en: 'You ate well, praised the borscht, and Grandmother is pleased with you.',
      }
    tone: good
  - id: end-awkward
    title: { uk: 'Незручний вечір', en: 'An awkward evening' }
    recap:
      {
        uk: 'Ти сказав «ні» — і за столом стало дуже тихо.',
        en: 'You said no — and the table went very quiet.',
      }
    tone: bad
  - id: end-strange
    title: { uk: 'Вона теж бачить', en: 'She sees it too' }
    recap:
      {
        uk: 'На стіні щось є, і бабуся це знає.',
        en: 'There is something on the wall, and Grandmother knows it.',
      }
    tone: strange
---

# Вечеря в мами — Dinner at Mama's

## din-n01

SPEAKER: mama

UK: Заходь, любий!
EN: Come in, dear!
GRAMMAR: imperative

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Заходь | заходити | come in | verb | 2sg. imper. (impf.) | A2 |  |
| , |  |  |  |  |  |  |
| любий | любий | dear | adj | m.sg. nom. (as an address) | A2 |  |
| ! |  |  |  |  |  |  |

NEXT: din-n02

## din-n02

SPEAKER: mama

UK: Ти голодний?
EN: Are you hungry?
GRAMMAR: adjective-predicate

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Ти | ти | you | pron | nom. (informal) | A1 |  |
| голодний | голодний | hungry | adj | m.sg. nom. | A2 |  |
| ? |  |  |  |  |  |  |

CHOICES:

### din-n02-c1 -> din-n03

UK: Так, я дуже голодний.
EN: Yes, I'm very hungry.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Так | так | yes | part |  | A1 |  |
| , |  |  |  |  |  |  |
| я | я | I | pron | nom. | A1 |  |
| дуже | дуже | very | adv |  | A1 |  |
| голодний | голодний | hungry | adj | m.sg. nom. | A2 |  |
| . |  |  |  |  |  |  |

ALT: Так, дуже.

### din-n02-c2 -> din-n04

UK: Ні, дякую, я не голодний.
EN: No, thank you, I'm not hungry.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Ні | ні | no | part |  | A1 |  |
| , |  |  |  |  |  |  |
| дякую | дякувати | thank you | verb | 1sg. pres. (impf.); дякую = thank you | A1 |  |
| , |  |  |  |  |  |  |
| я | я | I | pron | nom. | A1 |  |
| не | не | not | part | negation | A1 |  |
| голодний | голодний | hungry | adj | m.sg. nom. | A2 |  |
| . |  |  |  |  |  |  |

HINT: Ввічлива відмова — але мама не здасться. | A polite refusal — but Mama won't take no for an answer.

### din-n02-c3 -> din-n09

UK: А що це на стіні?
EN: And what is that on the wall?
GRAMMAR: locative-location

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| А | а | and | conj |  | A1 |  |
| що | що | what | pron | nom. | A1 |  |
| це | це | that | pron | demonstrative | A1 |  |
| на | на | on | prep | + loc. (location) | A1 |  |
| стіні | стіна | wall | noun | f.sg. loc. | A1 |  |
| ? |  |  |  |  |  |  |

## din-n03

SPEAKER: mama

UK: Чудово, я зварила борщ!
EN: Great, I made borscht!
GRAMMAR: past-tense, accusative-direct-object

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Чудово | чудово | great | adv |  | A2 |  |
| , |  |  |  |  |  |  |
| я | я | I | pron | nom. | A1 |  |
| зварила | зварити | made | verb | f.sg. past (pf. of варити) | A1 |  |
| борщ | борщ | borscht | noun | m.sg. acc. | A2 | beet soup — the centerpiece of a Ukrainian family table |
| ! |  |  |  |  |  |  |

NEXT: din-n05

## din-n04

SPEAKER: mama

UK: Нічого, борщ уже на столі.
EN: No matter, the borscht is already on the table.
GRAMMAR: locative-location

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Нічого | нічого | no matter | pred | colloquial ("it's nothing") | A2 | here = "never mind / no matter" |
| , |  |  |  |  |  |  |
| борщ | борщ | borscht | noun | m.sg. nom. | A2 |  |
| уже | уже | already | adv |  | A1 |  |
| на | на | on | prep | + loc. (location) | A1 |  |
| столі | стіл | table | noun | m.sg. loc. | A1 |  |
| . |  |  |  |  |  |  |

NEXT: din-n05

## din-n05

SPEAKER: babushka

UK: Наш борщ — дуже смачний.
EN: Our borscht is the tastiest.
GRAMMAR: superlative

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Наш | наш | our | pron | m.sg. nom. | A1 |  |
| борщ | борщ | borscht | noun | m.sg. nom. | A2 |  |
| — |  |  |  |  |  |  |
| дуже | дуже | the most | pron |  | A2 |  |
| смачний | смачний | tasty | adj | m.sg. nom. | A1 |  |
| . |  |  |  |  |  |  |

NEXT: din-n06

## din-n06

SPEAKER: mama

UK: Хочеш ще борщу?
EN: Do you want more borscht?
GRAMMAR: genitive-partitive

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Хочеш | хотіти | you want | verb | 2sg. pres. (impf.) | A1 |  |
| ще | ще | more | adv |  | A1 |  |
| борщу | борщ | borscht | noun | m.sg. gen. (partitive) | A2 |  |
| ? |  |  |  |  |  |  |

CHOICES:

### din-n06-c1 -> din-n07

UK: Так, можна ще трохи.
EN: Yes, a little more, please.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Так | так | yes | part |  | A1 |  |
| , |  |  |  |  |  |  |
| можна | можна | one may have | pred | impersonal | A1 |  |
| ще | ще | more | adv |  | A1 |  |
| трохи | трохи | a little | adv |  | A2 |  |
| . |  |  |  |  |  |  |

ALT: Так, ще трохи, будь ласка.

### din-n06-c2 -> din-n08

UK: Дякую, я ситий, усе було дуже смачно.
EN: Thank you, I'm full, everything was very tasty.
GRAMMAR: short-adjectives, past-tense

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Дякую | дякувати | thank you | verb | 1sg. pres. (impf.); дякую = thank you | A1 |  |
| , |  |  |  |  |  |  |
| я | я | I | pron | nom. | A1 |  |
| ситий | ситий | full | adj | m.sg. short form | A2 | the short form is the normal way to say "I'm full" |
| , |  |  |  |  |  |  |
| усе | увесь | everything | pron | n.sg. nom. | A1 |  |
| було | бути | was | verb | n.sg. past (impf.) | A1 |  |
| дуже | дуже | very | adv |  | A1 |  |
| смачно | смачно | tasty | adv | predicative | A1 |  |
| . |  |  |  |  |  |  |

ALT: Дякую, було дуже смачно.
HINT: Подякуй і похвали їжу. | Say thank you and praise the food.

### din-n06-c3 -> din-n10

UK: Ні.
EN: No.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Ні | ні | no | part |  | A1 |  |
| . |  |  |  |  |  |  |

## din-n07

SPEAKER: mama

UK: Їж, їж!
EN: Eat, eat!
GRAMMAR: imperative

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Їж | їсти | eat | verb | 2sg. imper. (impf.) | A2 | the insistent, affectionate imperative of every mother and grandmother at the table |
| , |  |  |  |  |  |  |
| їж | їсти | eat | verb | 2sg. imper. (impf.) | A2 |  |
| ! |  |  |  |  |  |  |

NEXT: din-n06

## din-n08

SPEAKER: babushka

UK: Молодець, приходь до нас ще.
EN: Good boy, come visit us again.
GRAMMAR: imperative, dative-direction

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Молодець | молодець | good boy | noun | m.sg. nom. (praise) | A2 | universal Ukrainian praise — "well done!" |
| , |  |  |  |  |  |  |
| приходь | приходити | come | verb | 2sg. imper. (impf.) | A2 |  |
| до | до | to | prep | + dat. | A1 |  |
| нас | ми | us | pron | dat. | A1 |  |
| ще | ще | again | adv |  | A1 |  |
| . |  |  |  |  |  |  |

ENDING: end-good

## din-n09

SPEAKER: mama

UK: Там нічого немає.
EN: There is nothing there.
GRAMMAR: genitive-negation

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Там | там | there | adv |  | A1 |  |
| нічого | ніщо | nothing | pron | gen. (object of немає) | A2 |  |
| немає | немає | there is no | pred | + gen. = there is no … | A1 |  |
| . |  |  |  |  |  |  |

NEXT: din-n11

## din-n10

SPEAKER: mama

UK: Ну гаразд.
EN: Well, alright.

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Ну | ну | well | part |  | A1 |  |
| гаразд | гаразд | alright | part |  | A2 |  |
| . |  |  |  |  |  |  |

ENDING: end-awkward

## din-n11

SPEAKER: babushka

UK: Вона теж це бачить.
EN: She sees it too.
GRAMMAR: accusative-direct-object

| text | lemma | translation | pos | grammar | level | note |
| --- | --- | --- | --- | --- | --- | --- |
| Вона | вона | she | pron | nom. | A1 |  |
| теж | теж | too | adv |  | A1 |  |
| це | це | it | pron | acc. | A1 |  |
| бачить | бачити | sees | verb | 3sg. pres. (impf.) | A1 |  |
| . |  |  |  |  |  |  |

ENDING: end-strange
