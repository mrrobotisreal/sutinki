import type {
  DialogueGraph,
  DialogueGraphChoice,
  DialogueGraphNode,
  DialogueRunPath,
  DialogueRunStep,
} from '@/db/repositories/dialogues';
import type { SentenceWithTokens } from '@/db/repositories/content';

/**
 * Test fixtures for the T27 engine/matching tests: a minimal typed graph
 * mirroring the a2-dialogue-001 «Вечеря в мами» shape (linear intro → choice
 * point → loop-capable choice point → three endings) without dragging the
 * real pack JSON through the Drizzle row types.
 */

const PACK = 'test-pack';
const DIALOGUE = 'test-dialogue';

export function sentence(id: string, uk: string, lemmas?: (string | null)[]): SentenceWithTokens {
  const words = uk.split(/\s+/).filter(Boolean);
  return {
    packId: PACK,
    id,
    storyId: DIALOGUE,
    orderIdx: 0,
    uk,
    en: `EN of ${uk}`,
    grammarTopics: null,
    tokens: words.map((w, i) => {
      const text = w.replace(/[.,!?]/g, '');
      return {
        packId: PACK,
        sentenceId: id,
        tokenIndex: i,
        storyId: DIALOGUE,
        text,
        textNorm: text.toLowerCase().replace(/ґ/g, 'г'),
        isPunct: false,
        spaceBefore: i > 0,
        lemma: lemmas?.[i] ?? text.toLowerCase(),
        lemmaNorm: (lemmas?.[i] ?? text).toLowerCase().replace(/ґ/g, 'г'),
        translation: 'gloss',
        pos: null,
        grammar: null,
        level: null,
        note: null,
      };
    }),
  };
}

export function choice(
  id: string,
  nodeId: string,
  uk: string,
  nextNodeId: string,
  opts: { asrAlternates?: string[]; hintEn?: string } = {},
): DialogueGraphChoice {
  return {
    packId: PACK,
    dialogueId: DIALOGUE,
    nodeId,
    id,
    orderIdx: 0,
    sentenceId: `${id}-sent`,
    nextNodeId,
    asrAlternates: opts.asrAlternates ?? null,
    hintUk: null,
    hintEn: opts.hintEn ?? null,
    sentence: sentence(`${id}-sent`, uk),
    audio: null,
  };
}

export function node(
  id: string,
  speakerId: string,
  uk: string,
  cont: { next?: string; endingId?: string; choices?: DialogueGraphChoice[] },
): DialogueGraphNode {
  return {
    packId: PACK,
    dialogueId: DIALOGUE,
    id,
    orderIdx: 0,
    speakerId,
    sentenceId: `${id}-sent`,
    kind: cont.choices ? 'choices' : cont.next ? 'next' : 'ending',
    nextNodeId: cont.next ?? null,
    endingId: cont.endingId ?? null,
    sentence: sentence(`${id}-sent`, uk),
    audio: null,
    choices: cont.choices ?? [],
  };
}

export const graph: DialogueGraph = {
  dialogue: {
    packId: PACK,
    id: DIALOGUE,
    orderIdx: 0,
    titleUk: 'Ужин',
    titleEn: 'Dinner',
    level: 'A2',
    startNodeId: 'n1',
    characters: [
      { id: 'mama', name: { uk: 'Мама', en: 'Mama' }, voice: 'v1', style: 'warm' },
      { id: 'player', name: { uk: 'Ти', en: 'You' }, voice: 'coach', style: 'neutral' },
    ],
  },
  nodes: [
    node('n1', 'mama', 'Проходи, дорогой!', { next: 'n2' }),
    node('n2', 'mama', 'Ти голодний?', {
      choices: [
        choice('c-yes', 'n2', 'Так, я дуже голодний.', 'n3', { asrAlternates: ['Так, дуже.'] }),
        choice('c-no', 'n2', 'Ні, дякую, я не голодний.', 'n4', {
          hintEn: 'A polite refusal.',
        }),
      ],
    }),
    node('n3', 'mama', 'Отлично, я сделала борщ!', { next: 'n6' }),
    node('n4', 'mama', 'Ничего, борщ уже на столе.', { next: 'n6' }),
    node('n6', 'mama', 'Хочеш ще борщу?', {
      choices: [
        choice('c-more', 'n6', 'Так, можна ще трохи.', 'n7'),
        choice('c-stop', 'n6', 'Дякую, я ситий.', 'n5'),
      ],
    }),
    node('n7', 'mama', 'Кушай, кушай!', { next: 'n6' }),
    node('n5', 'mama', 'Молодець, приходь ще.', { endingId: 'end-good' }),
  ],
  endings: [
    {
      packId: PACK,
      dialogueId: DIALOGUE,
      id: 'end-good',
      titleUk: 'Хороший ужин',
      titleEn: 'A good dinner',
      recapUk: 'Усі задоволені.',
      recapEn: 'Everyone is happy.',
      tone: 'good',
    },
  ],
};

export function path(steps: DialogueRunStep[]): DialogueRunPath {
  return { v: 1, steps };
}
