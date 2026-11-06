import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  EXAM_GATE_TAG,
  bankBannerAllowed,
  explanationsVisible,
  isHiddenGate,
  isRetake,
  isReservedAssessment,
  practiceExams,
  visibleExams,
} from '../gate';
import { monologueTickets, speakingPracticeEntries } from '../speaking/tickets-model';
import { writingPracticeEntries } from '../writing/writing-practice-model';

const GATE = ['ukr-exam', 'ukr-exam:mock', EXAM_GATE_TAG];
const MOCK = ['ukr-exam', 'ukr-exam:mock'];

describe('the gate tag', () => {
  it('is exactly ukr-exam:gate', () => {
    expect(EXAM_GATE_TAG).toBe('ukr-exam:gate');
  });
});

describe('isHiddenGate (table)', () => {
  const cases: [string, string[] | null, string[], boolean][] = [
    ['gate pack, never attempted', GATE, [], true],
    ['gate pack, other pack attempted', GATE, ['other'], true],
    ['gate pack, attempted once (any state)', GATE, ['p'], false],
    ['ordinary mock, never attempted', MOCK, [], false],
    ['untagged / null tags', null, [], false],
  ];
  for (const [name, tags, attempted, hidden] of cases) {
    it(name, () => {
      expect(isHiddenGate({ packId: 'p', packTags: tags }, new Set(attempted))).toBe(hidden);
    });
  }
  it('visibleExams drops only the unattempted gate pack', () => {
    const list = [
      { packId: 'p', packTags: GATE },
      { packId: 'q', packTags: MOCK },
    ];
    expect(visibleExams(list, []).map((x) => x.packId)).toEqual(['q']);
    expect(visibleExams(list, ['p']).map((x) => x.packId)).toEqual(['p', 'q']);
  });
});

describe('isReservedAssessment (UT19 borrowed-example protection)', () => {
  it('gate and mock packs are reserved; drills and untagged are not', () => {
    expect(isReservedAssessment('p', GATE)).toBe(true);
    expect(isReservedAssessment('p', MOCK)).toBe(true);
    expect(isReservedAssessment('p', ['ukr-exam', 'ukr-exam:drill'])).toBe(false);
    expect(isReservedAssessment('p', null)).toBe(false);
  });
});

describe('gate-pack surfaces', () => {
  it('no banner / explanations before the attempt is over; retake flag', () => {
    expect(bankBannerAllowed('mock', 'active')).toBe(false);
    expect(bankBannerAllowed('mock', 'finished')).toBe(true);
    expect(bankBannerAllowed('drill', null)).toBe(true);
    expect(explanationsVisible(GATE, false)).toBe(false);
    expect(explanationsVisible(GATE, true)).toBe(true);
    expect(explanationsVisible(MOCK, false)).toBe(true);
    expect(isRetake(0)).toBe(false);
    expect(isRetake(1)).toBe(true);
  });
});

// A fixture mock with speaking (task 1/3), writing and one drill.
const mkExam = (id: string) => ({
  format: 'ukr-state',
  level: 'A1',
  subtests: [
    {
      id: `${id}-w`,
      kind: 'writing',
      parts: [{ items: [{ id: `${id}-w1`, kind: 'writing', topic: 't' }] }],
    },
    {
      id: `${id}-s`,
      kind: 'speaking',
      parts: [
        {
          items: [
            { id: `${id}-s1`, kind: 'speaking-reply', topic: 't' },
            { id: `${id}-s3`, kind: 'speaking-monologue', topic: 't' },
          ],
        },
      ],
    },
  ],
});
const summary = (packId: string, examId: string, mode: 'mock' | 'drill', tags: string[]) =>
  ({
    packId,
    examId,
    mode,
    titleUk: examId,
    titleEn: examId,
    packTags: tags,
    exam: mkExam(`${packId}-${examId}`),
  }) as never;

describe('practice exclusion (ISS-003 lesson): every practice entry point', () => {
  const all = [
    summary('d', 'drill1', 'drill', ['ukr-exam']),
    summary('m1', 'mock1', 'mock', MOCK),
    summary('m2', 'mock2', 'mock', MOCK),
    summary('g', 'gate', 'mock', GATE),
  ];
  const mockItemIds = (pack: string) => [`${pack}-mock${pack === 'm1' ? 1 : 2}`];
  void mockItemIds;
  const surfaced = (list: ReturnType<typeof practiceExams<never>>) => {
    const ids = new Set<string>();
    for (const e of writingPracticeEntries(list)) ids.add(e.item.id);
    for (const e of speakingPracticeEntries(list)) ids.add(e.item.id);
    for (const t of monologueTickets(list)) ids.add(t.item.id);
    return ids;
  };

  it('with NO finished mock attempt: zero of any mock item id reaches writing / speaking / tickets', () => {
    const ids = surfaced(practiceExams(all as never[], new Set()) as never);
    expect([...ids].every((id) => id.startsWith('d-drill1'))).toBe(true);
    expect(
      [...ids].some((id) => id.startsWith('m1-') || id.startsWith('m2-') || id.startsWith('g-')),
    ).toBe(false);
    expect(ids.size).toBe(3);
  });
  it('after mock1 is finished its items appear; mock2 and the gate pack still do not', () => {
    const ids = surfaced(practiceExams(all as never[], new Set(['m1/mock1'])) as never);
    expect([...ids].some((id) => id.startsWith('m1-mock1'))).toBe(true);
    expect([...ids].some((id) => id.startsWith('m2-'))).toBe(false);
    expect([...ids].some((id) => id.startsWith('g-'))).toBe(false);
  });
  it('a gate pack never surfaces in practice even with a finished attempt', () => {
    const ids = surfaced(practiceExams(all as never[], new Set(['g/gate'])) as never);
    expect([...ids].some((id) => id.startsWith('g-'))).toBe(false);
  });
});

describe('lint-style: every list builder over exam summaries goes through the gate', () => {
  it('useExams defaults to the gate-aware scope and the texts/hub/tickets/drill callers pick practice', () => {
    const root = join(__dirname, '..');
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() && f !== '__tests__'
          ? walk(p)
          : p.match(/\.tsx?$/)
            ? [p]
            : [];
      });
    const offenders: string[] = [];
    for (const f of walk(root)) {
      const src = readFileSync(f, 'utf8')
        .split('\n')
        .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
        .join('\n');
      if (
        /repos\.exams\.listExams\(/.test(src) &&
        !f.endsWith('gate.ts') &&
        !/practiceExams|isGateTagged/.test(src)
      ) {
        offenders.push(f);
      }
      if (/useExams\(\{[^}]*\}\)/.test(src) && !/scope:/.test(src)) {
        // only hub-screen's level-presence probe may use the default (visible) scope
        if (!f.endsWith('hub-screen.tsx') && !f.endsWith('hooks.ts')) offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });
});
