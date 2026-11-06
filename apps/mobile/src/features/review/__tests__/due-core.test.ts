import { describe, expect, it } from 'vitest';

import { classifySource, clampNewPerDay, DEFAULT_QUEUE_PREFS, parseQueuePrefs } from '../due-core';

describe('queue prefs', () => {
  it('defaults: 10 words a day, sibling bury on', () => {
    expect(DEFAULT_QUEUE_PREFS).toEqual({ v: 1, newPerDay: 10, buryRelated: true });
    expect(parseQueuePrefs(undefined)).toEqual(DEFAULT_QUEUE_PREFS);
  });
  it('heals corrupt values field by field', () => {
    expect(parseQueuePrefs({ v: 1, newPerDay: 999, buryRelated: false })).toEqual({
      v: 1,
      newPerDay: 10,
      buryRelated: false,
    });
    expect(parseQueuePrefs('junk')).toEqual(DEFAULT_QUEUE_PREFS);
    expect(parseQueuePrefs({ v: 1, newPerDay: 25, buryRelated: 'x' }).newPerDay).toBe(25);
  });
  it('clamps to 0–50', () => {
    expect(clampNewPerDay(-3)).toBe(0);
    expect(clampNewPerDay(80)).toBe(50);
    expect(clampNewPerDay(12.4)).toBe(12);
    expect(clampNewPerDay(Number.NaN)).toBe(10);
  });
});

describe('classifySource', () => {
  const base = { sourceStoryId: null, sourceSentenceId: null, hasJournalEncounter: false };
  it('maps the columns a bank item already carries', () => {
    expect(classifySource({ ...base, sourceStoryId: 'lx-food', sourceSentenceId: 's1' })).toBe(
      'topic',
    );
    expect(classifySource({ ...base, sourceStoryId: 'story', sourceSentenceId: 's1' })).toBe(
      'reader',
    );
    expect(classifySource({ ...base, sourceStoryId: 'a1-scn-bank-001' })).toBe('scenario');
    expect(classifySource({ ...base, hasJournalEncounter: true })).toBe('journal');
    expect(classifySource(base)).toBe('manual');
  });
});

describe('copy', () => {
  it('split line + backlog + bulk toast', async () => {
    const { splitLine, backlogLine, bulkBankToast } = await import('../due-core');
    expect(splitLine(30, 12)).toBe('30 повторень + 12 нових');
    expect(splitLine(21, 1)).toBe('21 повторення + 1 нова');
    expect(splitLine(0, 10)).toBe('10 нових');
    expect(splitLine(5, 0)).toBe('5 повторень');
    expect(backlogLine(286)).toBe('У черзі: 286 нових');
    expect(backlogLine(0)).toBeNull();
    expect(bulkBankToast(87, 10)).toBe('+87 слів у Словнику · по 10 на день');
    expect(bulkBankToast(0, 10)).toBe('+0 слів — усі слова вже в Словнику');
    expect(bulkBankToast(3, 0)).toBe('+3 слова у Словнику · нові слова вимкнено');
  });

  it('plural agreement at 1/2/5/11/21/22/25', async () => {
    const { splitLine, bulkBankToast } = await import('../due-core');
    const reviews = (n: number) => splitLine(n, 0);
    expect(reviews(1)).toBe('1 повторення');
    expect(reviews(2)).toBe('2 повторення');
    expect(reviews(5)).toBe('5 повторень');
    expect(reviews(11)).toBe('11 повторень');
    expect(reviews(21)).toBe('21 повторення');
    expect(reviews(22)).toBe('22 повторення');
    expect(reviews(25)).toBe('25 повторень');
    const news = (n: number) => splitLine(0, n);
    expect(news(1)).toBe('1 нова');
    expect(news(2)).toBe('2 нові');
    expect(news(5)).toBe('5 нових');
    expect(news(11)).toBe('11 нових');
    expect(news(21)).toBe('21 нова');
    expect(news(22)).toBe('22 нові');
    expect(news(25)).toBe('25 нових');
    const words = (n: number) => bulkBankToast(n, 10).split(' у ')[0];
    expect(words(1)).toBe('+1 слово');
    expect(words(2)).toBe('+2 слова');
    expect(words(5)).toBe('+5 слів');
    expect(words(11)).toBe('+11 слів');
    expect(words(21)).toBe('+21 слово');
    expect(words(22)).toBe('+22 слова');
    expect(words(25)).toBe('+25 слів');
  });
});

describe('one function for every consumer (source scan)', () => {
  it('no consumer reads the raw card count or raw due list any more', async () => {
    const { readFileSync } = await import('node:fs');
    const files = [
      'src/db/hooks.ts',
      'src/features/motivation/widget-sync.ts',
      'src/features/motivation/notifications.ts',
      'src/features/review/daily/session.ts',
      'src/features/review/session.ts',
      'src/features/review/games/cloze/session.ts',
      'src/features/review/games/listening/session.ts',
      'src/features/review/games/sentence-builder/session.ts',
      'src/features/pronunciation/session.ts',
    ];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/reviews\s*\.\s*countDueCards|reviews\s*\.\s*listDueCards/);
    }
  });
});
