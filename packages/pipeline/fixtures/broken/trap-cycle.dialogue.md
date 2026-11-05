---
pack:
  id: broken-dlg-002
  version: 1
  type: dialogue
  title: { uk: 'Тест', en: 'Test' }
  level: A1
  tags: ['test']
dialogue:
  id: trap-dlg
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

## tc-n1

SPEAKER: mama

UK: Привіт.
EN: Hello.

| text   | lemma  | translation | pos    | grammar | level | note |
| ------ | ------ | ----------- | ------ | ------- | ----- | ---- |
| Привіт | привіт | hello       | interj |         | A1    |      |
| .      |        |             |        |         |       |      |

NEXT: tc-n2

## tc-n2

SPEAKER: mama

UK: Знову.
EN: Again.

| text  | lemma | translation | pos | grammar | level | note |
| ----- | ----- | ----------- | --- | ------- | ----- | ---- |
| Знову | знову | again       | adv |         | A2    |      |
| .     |       |             |     |         |       |      |

NEXT: tc-n1
