/**
 * Mechanically tokenize a short test sentence: words split on spaces, each
 * trailing/leading punctuation mark its own token. Only for building
 * structurally valid test sentences — real content is authored by hand.
 */
export function makeSentence(id: string, uk: string): Record<string, unknown> {
  const tokens: Record<string, unknown>[] = [];
  for (const chunk of uk.split(' ')) {
    const m = /^([«]*)([^«»]*?)([.,!?…»]*)$/u.exec(chunk)!;
    for (const p of m[1] ?? '') tokens.push({ text: p, isPunct: true });
    if (m[2]) {
      const tok: Record<string, unknown> = {
        text: m[2],
        lemma: m[2].toLowerCase(),
        translation: 'x',
        pos: 'noun',
        level: 'A1',
      };
      if (tokens.length > 0 && tokens[tokens.length - 1]!.text === '«') tok.spaceBefore = false;
      tokens.push(tok);
    }
    for (const p of m[3] ?? '') tokens.push({ text: p, isPunct: true });
  }
  const first = tokens[0];
  if (first && first.isPunct !== true) delete first.spaceBefore;
  return { id, uk, en: 'test', tokens };
}

/** A dialogue node for tests: one of `next`/`endingId`/`choices` via `rest`. */
export function makeNode(
  id: string,
  speakerId: string,
  uk: string,
  rest: Record<string, unknown>,
): Record<string, unknown> {
  return { id, speakerId, sentence: makeSentence(id, uk), ...rest };
}

/** A choice for tests (sentence id = choice id, the pipeline convention). */
export function makeChoice(id: string, uk: string, next: string): Record<string, unknown> {
  return { id, sentence: makeSentence(id, uk), next };
}

/**
 * A minimal, structurally valid `dialogue` pack for tests to mutate:
 * n1 → n2 (choice point: c1 → n3 ⇒ e-good, c2 → n4 ⇒ e-bad).
 */
export function makeValidDialoguePack(): Record<string, unknown> {
  return structuredClone({
    id: 'test-dialogue-001',
    version: 1,
    type: 'dialogue',
    title: { uk: 'Тест', en: 'Test' },
    level: 'A1',
    tags: ['test', 'dialogue'],
    stories: [],
    dialogues: [
      {
        id: 'test-dlg',
        title: { uk: 'Тест', en: 'Test' },
        level: 'A1',
        characters: [
          {
            id: 'mama',
            name: { uk: 'Мама', en: 'Mama' },
            voice: 'elevenlabs:Mariia',
            style: 'warm',
          },
          {
            id: 'player',
            name: { uk: 'Ти', en: 'You' },
            voice: 'elevenlabs:Ivan',
            style: 'neutral',
          },
        ],
        startNodeId: 'dlg-n1',
        nodes: [
          makeNode('dlg-n1', 'mama', 'Привет.', { next: 'dlg-n2' }),
          makeNode('dlg-n2', 'mama', 'Ти голодний?', {
            choices: [
              makeChoice('dlg-n2-c1', 'Так.', 'dlg-n3'),
              makeChoice('dlg-n2-c2', 'Нет.', 'dlg-n4'),
            ],
          }),
          makeNode('dlg-n3', 'mama', 'Хорошо.', { endingId: 'e-good' }),
          makeNode('dlg-n4', 'mama', 'Ладно.', { endingId: 'e-bad' }),
        ],
        endings: [
          {
            id: 'e-good',
            title: { uk: 'Хорошо', en: 'Good' },
            recap: { uk: 'Усе добре.', en: 'All good.' },
            tone: 'good',
          },
          {
            id: 'e-bad',
            title: { uk: 'Плохо', en: 'Bad' },
            recap: { uk: 'Усе погано.', en: 'All bad.' },
            tone: 'bad',
          },
        ],
      },
    ],
  });
}

/** A minimal, structurally valid `stories` pack for tests to mutate. */
export function makeValidPack(): Record<string, unknown> {
  return structuredClone({
    id: 'test-pack-001',
    version: 1,
    type: 'stories',
    title: { uk: 'Тест', en: 'Test' },
    level: 'A1',
    tags: ['test'],
    stories: [
      {
        id: 'test-story',
        title: { uk: 'Тест', en: 'Test' },
        level: 'A1',
        audio: [],
        sentences: [
          {
            id: 'test-s01',
            uk: 'Я дома.',
            en: 'I am home.',
            tokens: [
              {
                text: 'Я',
                lemma: 'я',
                translation: 'I',
                pos: 'pron',
                grammar: 'nom.',
                level: 'A1',
              },
              { text: 'дома', lemma: 'дома', translation: 'at home', pos: 'adv', level: 'A1' },
              { text: '.', isPunct: true },
            ],
          },
        ],
      },
    ],
  });
}
