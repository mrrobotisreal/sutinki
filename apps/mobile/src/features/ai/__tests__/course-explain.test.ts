import { describe, expect, it } from 'vitest';

import { buildExplainMessages } from '../prompts/explain';

describe('course «Поясни ще» prompts (T90 D9)', () => {
  it('a card target asks for a fresh English re-explanation with three new examples', () => {
    const msgs = buildExplainMessages({
      kind: 'course-card',
      id: 'a1-hotel-f03/u1/u1-x1',
      title: 'У + місцевий',
      body: 'The ending is -і for most nouns.',
      examples: ['Я живу у великому місті.'],
    });
    expect(msgs[0]!.content).toContain('three NEW A1 example sentences');
    expect(msgs[0]!.content).toContain('250 words');
    expect(msgs[1]!.content).toMatchSnapshot();
  });

  it('an item target names the chosen option as wrong and gives the authored explanation', () => {
    const msgs = buildExplainMessages({
      kind: 'course-item',
      id: 'a1-hotel-f03/u1-g01',
      stem: 'Я читаю про …',
      options: ['Москва', 'Москві', 'Москву'],
      chosen: 'Москву',
      correct: 'Москві',
      explain: 'Trigger: у + де? …',
      topic: 'case-prep',
    });
    expect(msgs[0]!.content).toContain('say plainly why that chosen option is wrong');
    expect(msgs[1]!.content).toContain('The learner chose: «Москву» (wrong)');
    expect(msgs[1]!.content).toMatchSnapshot();
  });

  it('omits the wrong-choice line when the learner was right', () => {
    const msgs = buildExplainMessages({
      kind: 'course-item',
      id: 'x',
      stem: 'S',
      chosen: 'А',
      correct: 'А',
      explain: 'e',
      topic: 't',
    });
    expect(msgs[1]!.content).not.toContain('(wrong)');
  });
});
