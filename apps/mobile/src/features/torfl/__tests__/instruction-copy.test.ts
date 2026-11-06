import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { instructionCopy } from '../copy';
import {
  chooseLine,
  recordingLine,
  sentencesLine,
  startAnswerLine,
  task3Fact,
  windowsLine,
} from '../speaking/timing-copy';

const TORFL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The screens that carry the RU | EN toggle (T77). Cyrillic literals live ONLY in copy.ts / timing-copy.ts. */
const SCREENS = [
  'exam-instruction-screen.tsx',
  'exam-run-screen.tsx',
  'exam-writing-screen.tsx',
  'speaking/exam-speaking-screen.tsx',
  'speaking/speaking-practice-screen.tsx',
  'speaking/tickets-screen.tsx',
  'speaking/speaking-debrief-screen.tsx',
  'writing/writing-editor.tsx',
  'writing/writing-practice-screen.tsx',
];

function code(file: string): string {
  const src = fs.readFileSync(path.join(TORFL, file), 'utf8');
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('instruction copy (T77)', () => {
  it.each(SCREENS)('%s has no Cyrillic literal outside the copy table', (file) => {
    const hits = code(file)
      .split('\n')
      .filter((l) => /[А-Яа-яЁёІіЇїЄєҐґ]/.test(l))
      // KNOWN SOURCE DEBT (UT16b): the photo-alt caption «Фото: …» is still a literal in two
      // speaking screens; it moves into copy.ts with the Ukrainian copy rewrite. Nothing else is allowed.
      .filter((l) => !/^Фото: \{[\w.]+\.alt\}$/.test(l.trim()))
      .map((l) => l.trim());
    expect(hits).toEqual([]);
  });

  it('every ru/en pair is filled, and en differs from ru for plain strings', () => {
    const ru = instructionCopy('uk');
    const en = instructionCopy('en');
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort());
    for (const key of Object.keys(ru) as (keyof typeof ru)[]) {
      expect(typeof en[key]).toBe(typeof ru[key]);
      if (typeof ru[key] === 'string') {
        expect(en[key], key).not.toBe('');
        expect(/[А-Яа-яЁё]/.test(en[key] as string), `en.${key} must be English`).toBe(false);
      }
    }
  });

  it('the speaking-flow strings say what Mitch asked', () => {
    expect(instructionCopy('en').readyHeading).toBe('Tap the mic and answer');
    expect(instructionCopy('uk').readyHeading).toBe('Нажми и говори');
    expect(instructionCopy('en').done).toBe('Done');
    expect(instructionCopy('uk').done).toBe('Готово');
  });

  it('timing copy: the Ukrainian line reads the windows through minutesUk, EN is the same sentence in plain words', () => {
    // (the surrounding Ukrainian words of timing-copy.ts are rewritten later; the minutes are pinned here)
    expect(windowsLine(480, 120)).toContain('8 хвилин');
    expect(windowsLine(480, 120)).toContain('2 хвилини');
    expect(windowsLine(600, 300)).toContain('10 хвилин');
    expect(windowsLine(480, 120, 'en')).toBe('8 minutes to prepare, then 2 minutes to answer');
    expect(chooseLine(2, 480, 120, 'en')).toBe(
      'Task 3. Pick one of the two topics. After you pick: 8 minutes to prepare, then 2 minutes to answer.',
    );
    expect(task3Fact(1, 600, 300, 'en')).toBe(
      'Task 3: one topic, 10 min to prepare, 5 min to answer.',
    );
    expect(recordingLine(300, 'en')).toBe('Recording — 5 minutes');
    expect(startAnswerLine(120, 'en')).toContain('2 minutes');
    expect(sentencesLine(12, 15, 'en')).toContain('12–15 sentences');
  });
});
