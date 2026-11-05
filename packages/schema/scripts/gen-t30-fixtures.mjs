// T30 fixture generator (authoring-time tool; output is committed).
// Builds the path-generalization fixture packs: three house-themed course
// units (hallway / kitchen / cellar), one UNKNOWN-scene unit (forward-compat
// proof), and one «Семья»-track unit. Deterministic: safe to re-run.
// NOTE: fixtures/manifest.json deliberately covers only the three bundled
// sample packs (T25 precedent — the dialogue fixture isn't in it either);
// do NOT rerun gen-fixtures.mjs for these.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'packs');

/** Mirror of the sentence-reconstruction's spacing rule (words spaced, punct attached). */
function uk(tokens) {
  let out = '';
  tokens.forEach((tok, i) => {
    const space = tok.spaceBefore ?? (i > 0 && !tok.isPunct);
    out += (space ? ' ' : '') + tok.text;
  });
  return out;
}

const w = (text, lemma, translation, pos, level, grammar) => ({
  text,
  lemma,
  translation,
  pos,
  level,
  ...(grammar ? { grammar } : {}),
});
const p = (text) => ({ text, isPunct: true });

function sentence(id, en, tokens, grammarTopics) {
  return { id, uk: uk(tokens), en, ...(grammarTopics ? { grammarTopics } : {}), tokens };
}

function unit({ id, title, level, tags, theme, track, lesson, story, prompts }) {
  return {
    id,
    version: 1,
    type: 'course-unit',
    title,
    level,
    tags,
    stories: [{ ...story, audio: [] }],
    lesson,
    ...(prompts ? { prompts } : {}),
    ...(theme ? { theme } : {}),
    ...(track ? { track } : {}),
  };
}

const packs = [
  unit({
    id: 'a1-course-unit-090',
    title: { uk: 'Передпокій', en: 'The Entryway' },
    level: 'A1',
    tags: ['course', 'house', 'fixture'],
    theme: { scene: 'hallway' },
    lesson: {
      id: 'u090-lesson',
      title: { uk: 'Що тут?', en: 'What is here?' },
      body: '## Що тут?\n\nNaming what you see in the dark: «Це куртка.» — the nominative case names things.\n',
      grammarTopics: ['nominative-subject'],
    },
    story: {
      id: 'hallway-coats',
      title: { uk: 'Чужі куртки', en: 'The Coats That Belong to No One' },
      level: 'A1',
      sentences: [
        sentence(
          'hall-s01',
          'This is our entryway.',
          [
            w('Це', 'це', 'this is', 'pron', 'A1'),
            w('наш', 'наш', 'our', 'pron', 'A1', 'm.sg. nom.'),
            w('передпокій', 'передпокій', 'entryway', 'noun', 'A2'),
            p('.'),
          ],
          ['nominative-subject'],
        ),
        sentence('hall-s02', 'A jacket hangs here.', [
          w('Тут', 'тут', 'here', 'adv', 'A1'),
          w('висить', 'висіти', 'hangs', 'verb', 'A2', '3sg. pres. (impf.)'),
          w('куртка', 'куртка', 'jacket', 'noun', 'A1'),
          p('.'),
        ]),
        sentence('hall-s03', 'It is not my jacket.', [
          w('Це', 'це', 'it is', 'pron', 'A1'),
          w('не', 'не', 'not', 'part', 'A1'),
          w('моя', 'мій', 'my', 'pron', 'A1', 'f.sg. nom.'),
          w('куртка', 'куртка', 'jacket', 'noun', 'A1'),
          p('.'),
        ]),
      ],
    },
  }),
  unit({
    id: 'a1-course-unit-091',
    title: { uk: 'Кухня', en: 'The Kitchen' },
    level: 'A1',
    tags: ['course', 'house', 'fixture'],
    theme: { scene: 'kitchen', accent: '#8A4B2F' },
    lesson: {
      id: 'u091-lesson',
      title: { uk: 'Що ти бачиш?', en: 'What do you see?' },
      body: '## Що ти бачиш?\n\nWhat you see, take, put — the accusative case marks the direct object.\n',
      grammarTopics: ['accusative-direct-object'],
    },
    story: {
      id: 'kitchen-knives',
      title: { uk: 'Ножі на кухні', en: 'The Knives in the Kitchen' },
      level: 'A1',
      sentences: [
        sentence('kitch-s01', 'In the morning I go to the kitchen.', [
          w('Вранці', 'вранці', 'in the morning', 'adv', 'A1'),
          w('я', 'я', 'I', 'pron', 'A1'),
          w('йду', 'йти', 'go', 'verb', 'A1', '1sg. pres. (impf.)'),
          w('на', 'на', 'to', 'prep', 'A1', '+acc.'),
          w('кухню', 'кухня', 'kitchen', 'noun', 'A1', 'acc.sg.'),
          p('.'),
        ]),
        sentence('kitch-s02', 'The knives are not lying the same way.', [
          w('Ножі', 'ніж', 'knives', 'noun', 'A1', 'nom.pl.'),
          w('лежать', 'лежати', 'lie', 'verb', 'A2', '3pl. pres. (impf.)'),
          w('не', 'не', 'not', 'part', 'A1'),
          w('так', 'так', 'that way', 'adv', 'A1'),
          p('.'),
        ]),
        sentence('kitch-s03', 'Who was here at night?', [
          w('Хто', 'хто', 'who', 'pron', 'A1'),
          w('був', 'бути', 'was', 'verb', 'A1', 'm.sg. past'),
          w('тут', 'тут', 'here', 'adv', 'A1'),
          w('уночі', 'уночі', 'at night', 'adv', 'A1'),
          p('?'),
        ]),
      ],
    },
  }),
  unit({
    id: 'a1-course-unit-092',
    title: { uk: 'Підвал', en: 'The Cellar' },
    level: 'A1',
    tags: ['course', 'house', 'fixture'],
    theme: { scene: 'cellar' },
    lesson: {
      id: 'u092-lesson',
      title: { uk: 'З ким ти?', en: 'With whom are you?' },
      body: '## З ким ти?\n\nWith what — and with whom: the instrumental case walks down the stairs with you.\n',
      grammarTopics: ['instrumental-with-z'],
    },
    story: {
      id: 'cellar-wait',
      title: { uk: 'У підвалі', en: 'In the Cellar' },
      level: 'A1',
      sentences: [
        sentence('cell-s01', 'The house has a cellar.', [
          w('У', 'у', 'in', 'prep', 'A1', '+loc.'),
          w('будинку', 'будинок', 'house', 'noun', 'A1', 'loc.sg.'),
          w('є', 'є', 'there is', 'verb', 'A1'),
          w('підвал', 'підвал', 'cellar', 'noun', 'A2'),
          p('.'),
        ]),
        sentence('cell-s02', 'It is always dark there.', [
          w('Там', 'там', 'there', 'adv', 'A1'),
          w('завжди', 'завжди', 'always', 'adv', 'A1'),
          w('темно', 'темно', 'dark', 'adv', 'A1'),
          p('.'),
        ]),
        sentence('cell-s03', 'I am not alone there.', [
          w('Я', 'я', 'I', 'pron', 'A1'),
          w('там', 'там', 'there', 'adv', 'A1'),
          w('не', 'не', 'not', 'part', 'A1'),
          w('сам', 'сам', 'alone', 'num', 'A1', 'm.sg. nom., used as "alone"'),
          p('.'),
        ]),
      ],
    },
  }),
  // UNKNOWN scene: proves forward compatibility — the app must fall back to
  // the default (non-house) path presentation for this unit.
  unit({
    id: 'a1-course-unit-093',
    title: { uk: 'Оранжерея', en: 'The Greenhouse' },
    level: 'A1',
    tags: ['course', 'fixture'],
    theme: { scene: 'greenhouse' },
    lesson: {
      id: 'u093-lesson',
      title: { uk: 'За будинком', en: 'Behind the house' },
      body: '## За будинком\n\nA scene the app does not know yet — the unit must render like any other.\n',
      grammarTopics: ['instrumental-with-z'],
    },
    story: {
      id: 'greenhouse-flowers',
      title: { uk: 'Нічні квіти', en: 'The Night Flowers' },
      level: 'A1',
      sentences: [
        sentence('green-s01', 'A greenhouse stands behind the house.', [
          w('За', 'за', 'behind', 'prep', 'A1', '+instr.'),
          w('будинком', 'будинок', 'house', 'noun', 'A1', 'instr.sg.'),
          w('стоїть', 'стояти', 'stands', 'verb', 'A1', '3sg. pres. (impf.)'),
          w('оранжерея', 'оранжерея', 'greenhouse', 'noun', 'B1'),
          p('.'),
        ]),
        sentence('green-s02', 'The flowers there grow at night.', [
          w('Квіти', 'квітка', 'flowers', 'noun', 'A1', 'nom.pl.'),
          w('там', 'там', 'there', 'adv', 'A1'),
          w('ростуть', 'рости', 'grow', 'verb', 'A2', '3pl. pres. (impf.)'),
          w('уночі', 'уночі', 'at night', 'adv', 'A1'),
          p('.'),
        ]),
      ],
    },
  }),
  unit({
    id: 'a2-family-090',
    title: { uk: 'Знайомство', en: 'Meeting the Family' },
    level: 'A2',
    tags: ['course', 'family', 'fixture'],
    track: 'family',
    lesson: {
      id: 'fam090-lesson',
      title: { uk: 'Ви і ти', en: 'Formal and informal you' },
      body: '## Ви і ти\n\nPoliteness formulas: «ви» for the parents until they offer «ти».\n',
      grammarTopics: ['politeness-vy-ty'],
    },
    prompts: [
      {
        id: 'fam090-p1',
        level: 'A2',
        prompt: { uk: 'Напишіть тост для родини.', en: 'Write a toast for the family.' },
        tags: ['family'],
      },
    ],
    story: {
      id: 'family-arrival',
      title: { uk: 'Приїзд', en: 'The Arrival' },
      level: 'A2',
      sentences: [
        sentence('fam-s01', 'Very nice to meet you.', [
          w('Дуже', 'дуже', 'very', 'adv', 'A1'),
          w('приємно', 'приємно', 'nice', 'adv', 'A2'),
          w('познайомитися', 'познайомитися', 'to meet', 'verb', 'A2', 'inf. (pf.)'),
          p('.'),
        ]),
        sentence('fam-s02', "Alina's mom is cooking dinner.", [
          w('Мама', 'мама', 'mom', 'noun', 'A1'),
          w('Аліни', 'Аліна', 'of Alina', 'name', 'A1', 'gen.sg.'),
          w('готує', 'готувати', 'is cooking', 'verb', 'A1', '3sg. pres. (impf.)'),
          w('вечерю', 'вечеря', 'dinner', 'noun', 'A1', 'acc.sg.'),
          p('.'),
        ]),
        sentence('fam-s03', 'We talk about family.', [
          w('Ми', 'ми', 'we', 'pron', 'A1'),
          w('говоримо', 'говорити', 'talk', 'verb', 'A1', '1pl. pres. (impf.)'),
          w('про', 'про', 'about', 'prep', 'A1', '+acc.'),
          w('родину', 'родина', 'family', 'noun', 'A1', 'acc.sg.'),
          p('.'),
        ]),
      ],
    },
  }),
];

for (const pack of packs) {
  const dir = join(packsDir, pack.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'pack.json'), JSON.stringify(pack, null, 2) + '\n');
  console.log(
    `wrote ${pack.id} (${pack.theme ? `scene=${pack.theme.scene}` : 'no theme'}, track=${pack.track ?? '(main)'})`,
  );
}
