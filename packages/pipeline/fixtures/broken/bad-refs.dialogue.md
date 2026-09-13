---
pack:
  id: broken-dlg-003
  version: 1
  type: dialogue
  title: { uk: 'Тест', en: 'Test' }
  level: A1
  tags: ['test']
dialogue:
  id: bad-refs-dlg
  title: { uk: 'Тест', en: 'Test' }
  level: A1
characters:
  - id: mama
    name: { uk: 'Мама', en: 'Mama' }
    voice: elevenlabs:Mariia
    style: warm
endings:
  - id: end-x
    title: { uk: 'Конец', en: 'End' }
    recap: { uk: 'Всё.', en: 'Done.' }
    tone: good
---

## br-n1

SPEAKER: ghost

UK: Привет.
EN: Hello.

| text   | lemma  | translation | pos    | grammar | level | note |
| ------ | ------ | ----------- | ------ | ------- | ----- | ---- |
| Привет | привет | hello       | interj |         | A1    |      |
| .      |        |             |        |         |       |      |

NEXT: br-missing

## br-n2

SPEAKER: mama

UK: Пока.
EN: Bye.

| text | lemma | translation | pos    | grammar | level | note |
| ---- | ----- | ----------- | ------ | ------- | ----- | ---- |
| Пока | пока  | bye         | interj |         | A1    |      |
| .    |       |             |        |         |       |      |

ENDING: end-missing
