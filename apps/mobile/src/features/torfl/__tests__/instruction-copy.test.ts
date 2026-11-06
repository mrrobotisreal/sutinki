import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { fmtMinutes, instructionCopy, UK_CONTENT } from '../copy';
import { DEFAULT_TORFL_PREFS } from '../settings-core';
import {
  answerWindow,
  chooseLine,
  recordingLine,
  sentencesLine,
  startAnswerLine,
  task3Fact,
  windowsLine,
} from '../speaking/timing-copy';

const TORFL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The screens that carry the UK | EN toggle (T77). Cyrillic literals live ONLY in copy.ts / timing-copy.ts. */
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
      .filter((l) => /[\u0400-\u04FF]/.test(l))
      // KNOWN SOURCE DEBT (UT16b): the photo-alt caption «Фото: …» is still a literal in two
      // speaking screens; it moves into copy.ts with the Ukrainian copy rewrite. Nothing else is allowed.
      .filter((l) => !/^Фото: \{[\w.]+\.alt\}$/.test(l.trim()))
      .map((l) => l.trim());
    expect(hits).toEqual([]);
  });

  it('every uk/en pair is filled; EN has no Cyrillic, UK has no Russian-only letters', () => {
    const ru = instructionCopy('uk');
    const en = instructionCopy('en');
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort());
    for (const key of Object.keys(ru) as (keyof typeof ru)[]) {
      expect(typeof en[key]).toBe(typeof ru[key]);
      if (typeof ru[key] === 'string') {
        expect(en[key], key).not.toBe('');
        expect(/[\u0400-\u04FF]/.test(en[key] as string), `en.${key} must be English`).toBe(false);
        expect(ru[key], `uk.${key}`).not.toBe('');
        expect(
          /[\u0451\u044B\u044D\u044A\u0401\u042B\u042D\u042A]/.test(ru[key] as string),
          `uk.${key} has a Russian letter`,
        ).toBe(false);
      }
    }
  });

  it('function-valued entries render in both languages: no empty, no Cyrillic in EN, no Russian letters in UK', () => {
    const args = [3, 2, 5, 1, 12, 0];
    const strArgs: string[] = ['5 хв'];
    for (const lang of ['uk', 'en'] as const) {
      const table = instructionCopy(lang) as Record<string, unknown>;
      for (const [key, v] of Object.entries(table)) {
        if (typeof v !== 'function') continue;
        let out: string;
        try {
          out = (v as (...a: unknown[]) => string)(...args);
        } catch {
          out = (v as (...a: unknown[]) => string)(...strArgs);
        }
        expect(typeof out, `${lang}.${key}`).toBe('string');
        expect(out.length, `${lang}.${key}`).toBeGreaterThan(0);
        if (lang === 'en') expect(/[\u0400-\u04FF]/.test(out), `en.${key}`).toBe(false);
        else
          expect(/[\u0451\u044B\u044D\u044A\u0401\u042B\u042D\u042A]/.test(out), `uk.${key}`).toBe(
            false,
          );
      }
    }
  });

  it('plural agreement in the Ukrainian counted strings', () => {
    const uk = instructionCopy('uk');
    expect(uk.ticketsSub(1)).toBe('Монолог · 1 тема');
    expect(uk.ticketsSub(3)).toBe('Монолог · 3 теми');
    expect(uk.ticketsSub(5)).toBe('Монолог · 5 тем');
    expect(fmtMinutes('uk', 90)).toBe('1 год 30 хв');
    expect(fmtMinutes('en', 90)).toBe('1 h 30 min');
  });

  it('the ticket + answers vocabulary is Ukrainian', () => {
    const uk = instructionCopy('uk');
    expect(uk.tickets).toBe('Білети');
    expect(uk.drawTicket).toBe('Витягнути білет');
    expect(uk.speaking).toBe('Говоріння');
    expect(UK_CONTENT.letterPlaceholder).toBe('Привіт, …');
  });

  it('the instruction language defaults to uk; the toggle reads «Українська» / «English»', () => {
    expect(DEFAULT_TORFL_PREFS.instructionLang).toBe('uk');
    expect(fs.readFileSync(path.join(TORFL, 'instruction-lang.ts'), 'utf8')).toContain(
      "lang: 'uk',",
    );
    const toggle = fs.readFileSync(path.join(TORFL, 'lang-toggle.tsx'), 'utf8');
    expect(toggle).toContain("'Українська'");
    expect(toggle).toContain("'English'");
    expect(toggle).not.toContain('Русский');
  });

  it('the speaking-flow strings say what Mitch asked', () => {
    expect(instructionCopy('en').readyHeading).toBe('Tap the mic and answer');
    expect(instructionCopy('uk').readyHeading).toBe('Торкнися й говори');
    expect(instructionCopy('en').done).toBe('Done');
    expect(instructionCopy('uk').done).toBe('Готово');
  });

  it('timing copy: the Ukrainian line reads the windows through minutesUk, EN is the same sentence in plain words', () => {
    // (minutes through minutesUk; the surrounding words are Ukrainian)
    expect(windowsLine(480, 120)).toContain('8 хвилин');
    expect(windowsLine(480, 120)).toContain('на підготовку');
    expect(chooseLine(2, 480, 120)).toContain('Обери одну з двох тем');
    expect(task3Fact(2, 480, 120)).toContain('одна тема з двох');
    expect(answerWindow(120)).toBe('2 хвилини');
    expect(windowsLine(480, 120)).toContain('2 хвилини');
    expect(windowsLine(600, 300)).toContain('10 хвилин');
    expect(windowsLine(480, 120, 'en')).toBe('8 minutes to prepare, then 2 minutes to answer');
    expect(chooseLine(2, 480, 120, 'en')).toBe(
      'Monologue. Pick one of the two topics. After you pick: 8 minutes to prepare, then 2 minutes to answer.',
    );
    expect(task3Fact(1, 600, 300, 'en')).toBe(
      'Monologue: one topic, 10 min to prepare, 5 min to answer.',
    );
    expect(recordingLine(300, 'en')).toBe('Recording — 5 minutes');
    expect(startAnswerLine(120, 'en')).toContain('2 minutes');
    expect(sentencesLine(12, 15, 'en')).toContain('12–15 sentences');
  });
});
