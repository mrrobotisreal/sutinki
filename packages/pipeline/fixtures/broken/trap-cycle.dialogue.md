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
    title: { uk: 'Конец', en: 'End' }
    recap: { uk: 'Всё.', en: 'Done.' }
    tone: good
---

## tc-n1

SPEAKER: mama

UK: Привет.
EN: Hello.

| text   | lemma  | translation | pos    | grammar | level | note |
| ------ | ------ | ----------- | ------ | ------- | ----- | ---- |
| Привет | привет | hello       | interj |         | A1    |      |
| .      |        |             |        |         |       |      |

NEXT: tc-n2

## tc-n2

SPEAKER: mama

UK: Опять.
EN: Again.

| text  | lemma | translation | pos | grammar | level | note |
| ----- | ----- | ----------- | --- | ------- | ----- | ---- |
| Опять | опять | again       | adv |         | A2    |      |
| .     |       |             |     |         |       |      |

NEXT: tc-n1
