---
pack:
  id: broken-dlg-001
  version: 1
  type: dialogue
  title: { uk: 'Тест', en: 'Test' }
  level: A1
  tags: ['test']
dialogue:
  id: broken-dlg
  title: { uk: 'Тест', en: 'Test' }
  level: A1
characters:
  - id: mama
    name: { uk: 'Мама', en: 'Mama' }
    voice: elevenlabs:Mariia
    style: warm
endings:
  - id: end-x
    title: { uk: 'Кінець', en: 'End' }
    recap: { uk: 'Усе.', en: 'Done.' }
    tone: good
---

## bd-n1

SPEAKER: mama

UK: Привіт.
EN: Hello.

| text   | lemma  | translation | pos    | grammar | level | note |
| ------ | ------ | ----------- | ------ | ------- | ----- | ---- |
| Привіт | привіт | hello       | interj |         | A1    |      |
| .      |        |             |        |         |       |      |

NEXT: bd-n2

## bd-n2

SPEAKER: mama

UK: Бувай.
EN: Bye.

| text | lemma | translation | pos    | grammar | level | note |
| ---- | ----- | ----------- | ------ | ------- | ----- | ---- |
| Бувай | бувай | bye         | interj |         | A1    |      |
| .    |       |             |        |         |       |      |

ENDING: end-x

## bd-orphan

SPEAKER: mama

UK: Ніхто.
EN: Nobody.

| text  | lemma | translation | pos  | grammar | level | note |
| ----- | ----- | ----------- | ---- | ------- | ----- | ---- |
| Ніхто | ніхто | nobody      | pron | nom.    | A1    |      |
| .     |       |             |      |         |       |      |

ENDING: end-x
