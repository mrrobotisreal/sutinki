import { describe, expect, it } from 'vitest';

import { initialState, type TurnState } from '../engine/turn-machine';
import { stateLineText } from '../stage/state-line-text';

import { graph } from './engine-fixtures';

/** The state line never shows a transcript (T62 §9.3) — only what is happening. */
const base = initialState(graph);
const withPhase = (phase: TurnState['phase']): TurnState => ({
  ...base,
  phase,
  lastTranscript: 'меня зовут митч',
});

describe('stateLineText', () => {
  it('names the phase, never the transcript', () => {
    const cases: [TurnState['phase'], string][] = [
      [{ kind: 'intro' }, ''],
      [{ kind: 'saying', lineIdx: 0 }, 'Кирилл говорить…'],
      [{ kind: 'listening', recording: 'idle' }, 'Твоя черга — натисни й говори'],
      [{ kind: 'listening', recording: 'tap' }, 'Слухаю…'],
      [{ kind: 'listening', recording: 'hold' }, 'Слухаю…'],
      [{ kind: 'deciding', stage: 'transcribing' }, 'Думаю…'],
      [{ kind: 'deciding', stage: 'rescuing' }, 'Думаю…'],
      [{ kind: 'reacting', reaction: 'confused', queue: [], idx: 0 }, 'Кирилл перепитує…'],
      [{ kind: 'reacting', reaction: 'react', queue: [], idx: 0 }, 'Кирилл перепитує…'],
      [{ kind: 'reacting', reaction: 'hint', queue: [], idx: 0 }, 'Кирилл підказує…'],
      [{ kind: 'reacting', reaction: 'slower', queue: [], idx: 0 }, 'Кирилл повторює…'],
      [{ kind: 'reacting', reaction: 'explain', queue: [], idx: 0 }, 'Кирилл пояснює…'],
      [{ kind: 'reacting', reaction: 'silence', queue: [], idx: 0 }, 'Кирилл говорить…'],
      [{ kind: 'ending', endingId: 'end-ok' }, ''],
      [{ kind: 'paused', resume: { kind: 'intro' } }, 'Пауза'],
    ];
    for (const [phase, expected] of cases) {
      const text = stateLineText(withPhase(phase), 'Кирилл');
      expect(text).toBe(expected);
      expect(text).not.toContain('митч');
    }
  });
});
