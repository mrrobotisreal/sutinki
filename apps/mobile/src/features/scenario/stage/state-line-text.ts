import type { TurnState } from '../engine/turn-machine';

/**
 * The stage's state line text (T62 §9.3): what is happening, never a
 * transcript. Pure so the "no transcript" rule is unit-tested.
 */
export function stateLineText(state: TurnState, host: string): string {
  const p = state.phase;
  switch (p.kind) {
    case 'intro':
      return '';
    case 'saying':
      return `${host} говорить…`;
    case 'listening':
      return p.recording === 'idle' ? 'Твоя черга — натисни й говори' : 'Слухаю…';
    case 'deciding':
      return 'Думаю…';
    case 'reacting':
      switch (p.reaction) {
        case 'confused':
        case 'react':
          return `${host} перепитує…`;
        case 'hint':
        case 'second':
        case 'dont-understand':
          return `${host} підказує…`;
        case 'repeat':
        case 'slower':
          return `${host} повторює…`;
        case 'explain':
        case 'howtosay':
          return `${host} пояснює…`;
        default:
          return `${host} говорить…`;
      }
    case 'ending':
      return '';
    case 'paused':
      return 'Пауза';
  }
}
