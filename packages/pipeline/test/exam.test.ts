import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsePack, type Pack } from '@sutinki/schema';
import {
  annotateDrafts,
  DraftError,
  EXAM_THEME_SLUGS,
  EXAM_TOPICS,
  packFileList,
  parseExamDraft,
  parseIssuePath,
  renderMatrixMap,
  renderOfficialShape,
  renderRefTable,
  renderTopicCensus,
  runPublish,
  runValidate,
  sniffDraftKind,
} from '../src/index.ts';

/**
 * T67: the `*.exam.md` draft format, its assembly with story drafts, the
 * four exam reports, the a1-ukrexam-fixture round-trip, the broken fixtures and
 * a scratch publish (TORFL_EXAM_PREP §3.3).
 */

const pkgDir = join(__dirname, '..');
const fixture = (...p: string[]) => join(pkgDir, 'fixtures', ...p);
const fxDir = fixture('ukr-exam-fixture');
const fixturePackPath = join(
  pkgDir,
  '..',
  'schema',
  'fixtures',
  'packs',
  'a1-ukrexam-fixture',
  'pack.json',
);
const read = (path: string) => ({ path, source: readFileSync(path, 'utf8') });

/** The fixture drafts in the CLI's glob order (`ukr-exam-fixture/*.md`). */
const fixtureFiles = () =>
  readdirSync(fxDir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => read(join(fxDir, f)));
const storyFiles = () => [read(join(fxDir, 'rd-01.draft.md')), read(join(fxDir, 'ls-01.draft.md'))];
/** The published fixture pack ships Piper audio for ls-01 / ex-01; the drafts carry none. */
const withoutAudio = (pack: Pack): Pack => ({
  ...pack,
  stories: pack.stories.map((st) => {
    return { ...st, audio: [] };
  }),
});

function issuesOf(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(DraftError);
    return (e as DraftError).issues;
  }
  throw new Error('expected a DraftError, but the call succeeded');
}

function lineOf(source: string, pred: (line: string) => boolean): number {
  const idx = source.split(/\r?\n/).findIndex(pred);
  expect(idx).toBeGreaterThanOrEqual(0);
  return idx + 1;
}

const PACK_META = `pack:
  id: a1-ukrexam-mini
  version: 1
  type: exam
  title: { uk: 'Міні', en: 'Mini' }
  level: A1
  tags: ['ukr-exam']
  category: ukr-exam-a1
`;

const miniDrill = (
  pack = PACK_META,
  items = `            - { id: q1, kind: choice, topic: g19, stem: 'Я живу … Києві.', options: ['в', 'на'], answer: 0 }\n`,
) => `---
${pack}exam:
  id: mini
  format: ukr-state
  level: A1
  mode: drill
  title: { uk: 'Міні', en: 'Mini' }
  subtests:
    - id: lexgram
      kind: lexgram
      title: { uk: 'Лексика', en: 'Lexis' }
      instructions: { uk: 'Оберіть.', en: 'Choose.' }
      durationMin: 5
      dictionary: false
      navigation: free
      pointsPerItem: 1
      maxPoints: 1
      parts:
        - id: p1
          instructions: { uk: 'Завдання 1.', en: 'Item 1.' }
          items:
${items}---
Нотатки автора ігноруються.
`;

describe('exam drafts — sniffing + parsing', () => {
  it('recognizes an exam draft by its exam: key (not the filename)', () => {
    expect(sniffDraftKind('x.md', miniDrill())).toBe('exam');
    expect(sniffDraftKind('x.exam.md', readFileSync(join(fxDir, 'rd-01.draft.md'), 'utf8'))).toBe(
      'story',
    );
  });

  it('parses the frontmatter through ExamSchema; the body is author notes', () => {
    const d = parseExamDraft('mini.exam.md', miniDrill());
    expect(d.exam.id).toBe('mini');
    expect(d.pack?.id).toBe('a1-ukrexam-mini');
    expect(d.exam.subtests[0]!.parts[0]!.items[0]!.kind).toBe('choice');
  });

  it('reports schema issues at the line of the offending YAML node', () => {
    const source = miniDrill(
      PACK_META,
      `            - id: q1\n              kind: choice\n              topic: g19\n              stem: 'Я вдома.'\n              options: ['а', 'и']\n              answer: 5\n`,
    );
    const issues = issuesOf(() => parseExamDraft('mini.exam.md', source));
    expect(issues).toHaveLength(1);
    expect(issues[0]!.line).toBe(lineOf(source, (l) => l.trim() === 'answer: 5'));
    expect(issues[0]!.message).toContain('answer 5 is out of range for 2 options');
  });

  it('reports YAML syntax errors with a line, and rejects unknown frontmatter keys', () => {
    const bad = miniDrill().replace(
      "title: { uk: 'Міні', en: 'Mini' }\n  subtests",
      "title: { uk: 'Міні'\n  subtests",
    );
    expect(issuesOf(() => parseExamDraft('x.exam.md', bad))[0]!.message).toContain(
      'not valid YAML',
    );
    const extra = miniDrill().replace('exam:\n', 'notes: hi\nexam:\n');
    expect(issuesOf(() => parseExamDraft('x.exam.md', extra))[0]!.message).toContain(
      'Unrecognized key',
    );
  });

  it('parseIssuePath round-trips a schema issue path', () => {
    expect(parseIssuePath('exams[1].subtests[2].parts[0].items[3].passage.storyId')).toEqual([
      'exams',
      1,
      'subtests',
      2,
      'parts',
      0,
      'items',
      3,
      'passage',
      'storyId',
    ]);
  });
});

describe('exam drafts — assembly', () => {
  it('a story-less exam pack assembles from an exam draft carrying pack: (no refs)', () => {
    const pack = annotateDrafts([{ path: 'mini.exam.md', source: miniDrill() }]);
    expect(pack.type).toBe('exam');
    expect(pack.category).toBe('ukr-exam-a1');
    expect(pack.stories).toEqual([]);
    expect(pack.exams!.map((e) => e.id)).toEqual(['mini']);
  });

  it('a story-less exam draft without pack: is an error; so is one with story refs', () => {
    const noPack = issuesOf(() =>
      annotateDrafts([{ path: 'mini.exam.md', source: miniDrill('') }]),
    );
    expect(noPack[0]!.message).toContain('must carry its "pack:" meta');

    const withRef = miniDrill(
      PACK_META,
      `            - { id: q1, kind: choice, topic: rd-detail, passage: { storyId: rd-01 }, stem: 'Оксана живе в …', options: ['Києві', 'Львові'], answer: 0 }\n`,
    );
    const issues = issuesOf(() => annotateDrafts([{ path: 'mini.exam.md', source: withRef }]));
    expect(issues[0]!.message).toContain(
      'references story "rd-01", but no story drafts were given',
    );
    expect(issues[0]!.line).toBe(lineOf(withRef, (l) => l.includes('passage: { storyId: rd-01 }')));
  });

  it('exam drafts need type: exam in the pack meta', () => {
    const meta = PACK_META.replace('type: exam', 'type: stories');
    const issues = issuesOf(() =>
      annotateDrafts([{ path: 'mini.exam.md', source: miniDrill(meta) }]),
    );
    expect(issues.map((i) => i.message).join('\n')).toContain('an exam pack has type: exam');
  });

  it('an exam draft’s pack: must match the story drafts byte-for-byte', () => {
    const differing = miniDrill(PACK_META.replace('a1-ukrexam-mini', 'a1-ukrexam-fixture'));
    const issues = issuesOf(() =>
      annotateDrafts([...storyFiles(), { path: 'mini.exam.md', source: differing }]),
    );
    expect(
      issues.some((i) => i.file === 'mini.exam.md' && i.message.includes('differs from')),
    ).toBe(true);
  });

  it('rejects duplicate exam ids across exam drafts', () => {
    const a = miniDrill('');
    const issues = issuesOf(() =>
      annotateDrafts([
        ...storyFiles(),
        { path: 'a.exam.md', source: a },
        { path: 'b.exam.md', source: a },
      ]),
    );
    expect(issues[0]).toMatchObject({
      file: 'b.exam.md',
      message: expect.stringContaining('duplicate exam id "mini" (already used in a.exam.md)'),
    });
  });

  it('exams keep the CLI order of their drafts', () => {
    const pack = annotateDrafts(fixtureFiles());
    expect(pack.exams!.map((e) => e.id)).toEqual([
      'lg-g19',
      'ls-liudyna',
      'rd-liudyna',
      'sp-photo',
      'wr-message',
      'a1-mock-fx',
    ]);
  });
});

describe('a1-ukrexam-fixture round-trip (UT16)', () => {
  it('annotate on ukr-exam-fixture/*.md deep-equals the schema fixture pack (minus the rendered Piper audio)', () => {
    const pack = annotateDrafts(fixtureFiles());
    const sample = JSON.parse(readFileSync(fixturePackPath, 'utf8')) as Pack;
    // UT17b: the hand-written journal `prompts` (the «Мої відповіді» bank) have no draft; the annotate path never emits them.
    const { prompts: _prompts, ...rest } = withoutAudio(sample) as Pack & { prompts?: unknown };
    void _prompts;
    expect(pack).toEqual(rest);
  });

  it('is a ukr-state exam pack with three stories, the mock and five drills — and stays out of the app manifest', () => {
    const pack = JSON.parse(readFileSync(fixturePackPath, 'utf8')) as Pack;
    expect(pack).toMatchObject({
      id: 'a1-ukrexam-fixture',
      type: 'exam',
      category: 'ukr-exam-a1',
      level: 'A1',
    });
    expect(pack.stories.map((s) => s.id).sort()).toEqual(['ex-01', 'ls-01', 'rd-01']);
    expect(pack.exams!.every((e) => e.format === 'ukr-state')).toBe(true);
    const manifest = JSON.parse(
      readFileSync(join(pkgDir, '..', 'schema', 'fixtures', 'manifest.json'), 'utf8'),
    ) as { packs: { id: string }[] };
    expect(manifest.packs.map((p) => p.id)).not.toContain('a1-ukrexam-fixture');
  });

  it('covers the new kinds: matching (headings + qa), true-false, gap-word/gap-form, a photo image, a typed half-credit item', () => {
    const pack = parsePack(JSON.parse(readFileSync(fixturePackPath, 'utf8')));
    const items = pack.exams!.flatMap((e) =>
      e.subtests.flatMap((st) => st.parts.flatMap((pt) => pt.items)),
    );
    const kinds = new Set(items.map((i) => i.kind));
    expect([...kinds].sort()).toEqual([
      'choice',
      'matching',
      'speaking-monologue',
      'speaking-reply',
      'typed',
      'writing',
    ]);
    const variants = new Set(
      items.flatMap((i) =>
        (i.kind === 'choice' || i.kind === 'matching') && i.variant ? [i.variant] : [],
      ),
    );
    expect([...variants].sort()).toEqual(['gap-form', 'gap-word', 'headings', 'qa', 'true-false']);
    expect(items.some((i) => i.kind === 'speaking-monologue' && i.image !== undefined)).toBe(true);
    expect(items.find((i) => i.kind === 'typed')).toMatchObject({ half: ['парк'] });
  });

  it('the mock: four parts in order, 25 % shape, no lexgram, conforming to the A1 shape (zero deviations)', () => {
    const mock = parsePack(JSON.parse(readFileSync(fixturePackPath, 'utf8'))).exams!.find(
      (e) => e.id === 'a1-mock-fx',
    )!;
    expect(mock.subtests.map((st) => st.kind)).toEqual([
      'listening',
      'reading',
      'writing',
      'speaking',
    ]);
    expect(renderOfficialShape(mock)).toBe(
      'Official shape — a1-mock-fx: ✓ official shape (ukr-state A1 mock, modelled «за зразком державного іспиту»)',
    );
  });

  it('ships the Piper audio and the photo image in the publish file list', () => {
    const dir = join(fixturePackPath, '..');
    const pack = parsePack(JSON.parse(readFileSync(fixturePackPath, 'utf8')));
    expect(packFileList(pack, dir).sort()).toEqual([
      'audio/ex-01.opus',
      'audio/ls-01.opus',
      'images/photo-01.png',
      'pack.json',
    ]);
  });
});

describe('exam reports', () => {
  const pack = () => parsePack(JSON.parse(readFileSync(fixturePackPath, 'utf8')));
  const mock = () => pack().exams!.find((e) => e.id === 'a1-mock-fx')!;

  it('matrix map: every subtest with Σ ✓ (objective) or rubric; matching counts pairs', () => {
    const text = renderMatrixMap(mock());
    expect(text).toContain('Matrix map — «Зразок A1 (тест)» (a1-mock-fx, ukr-state A1 mock)');
    expect(text).toContain(
      'ls — listening «Слухання» · 8 min · no dictionary · linear · audio ×2 · Σ 8 / 8 ✓',
    );
    expect(text).toContain('rd — reading «Читання» · 30 min · no dictionary · free · Σ 16 / 16 ✓');
    expect(text).toContain(
      'wr — writing «Письмо» · 20 min · no dictionary · free · rubric % of 33',
    );
    expect(text).toMatch(/rd06\s+matching\s+rd-qa\s+4 pt 4 pairs/);
    expect(text).toMatch(/ls05\s+choice\s+ls-tf\s+1 pt true-false/);
    expect(text).toMatch(/sp44\s+speaking-monologue\s+sp-photo\s+rubric/);
    expect(text).not.toContain('✗');
  });

  it('topic census counts items per slug; unknown / misplaced slugs get ?; theme slugs are valid anywhere', () => {
    expect(renderTopicCensus(mock())).toMatch(/rd-tf\s+4\s+reading$/m);
    expect(renderTopicCensus(mock())).not.toContain('?');
    const exam = structuredClone(mock());
    const rd = exam.subtests.find((x) => x.kind === 'reading')!;
    (rd.parts[1]!.items[0] as { topic: string }).topic = 'case-locative';
    (rd.parts[1]!.items[1] as { topic: string }).topic = 'ls-mc3';
    (rd.parts[1]!.items[2] as { topic: string }).topic = 'dim';
    const text = renderTopicCensus(exam);
    expect(text).toMatch(/case-locative\s+1\s+reading\s+\?\s+\(not a UKR_EXAM_PREP §4 slug/);
    expect(text).toContain('(§4 lists it under listening)');
    expect(text).toMatch(/^ {2}dim\s+1\s+reading$/m);
    expect(Object.values(EXAM_TOPICS).flat()).toHaveLength(38 + 6 + 2 + 2 + 3);
    expect(EXAM_THEME_SLUGS).toHaveLength(12);
  });

  it('official shape: a drill is not checked; the conforming mock prints ✓', () => {
    expect(renderOfficialShape(pack().exams!.find((e) => e.id === 'lg-g19')!)).toContain(
      'not checked (drill',
    );
    expect(renderOfficialShape(mock())).toContain('✓ official shape (ukr-state A1 mock');
  });

  it('official shape: a mutated mock prints ⚠ lines and the deviation count', () => {
    const bad = structuredClone(mock());
    const ls = bad.subtests.find((x) => x.kind === 'listening')!;
    ls.audioPlays = 1;
    ls.durationMin = 12;
    expect(renderOfficialShape(bad).split('\n')).toEqual([
      'Official shape — a1-mock-fx: 2 deviations',
      '  ⚠ official-shape: listening "ls" durationMin 12 — official 8',
      '  ⚠ official-shape: listening "ls" audioPlays 1 — official 2',
    ]);
  });

  it('official shape: B1 / B2 / C1 clones are checked against their own shapes (B2/C1 have no citizenship form)', () => {
    const b1 = structuredClone(mock());
    b1.level = 'B1';
    expect(renderOfficialShape(b1).split('\n')[0]).toMatch(
      /^Official shape — a1-mock-fx: \d+ deviations$/,
    );
    expect(renderOfficialShape(b1)).toContain('listening "ls" has items 8 — official 12');
  });

  it('official shape: a torfl mock at B1 is still not checked', () => {
    const t = structuredClone(mock());
    t.format = 'torfl';
    t.level = 'B1';
    expect(renderOfficialShape(t)).toBe(
      'Official shape — a1-mock-fx: not checked (mock, torfl B1 — only mocks with a shape are)',
    );
  });

  it('ref table: every ref ✓, inherited listening audio marked ↑', () => {
    const { text, broken } = renderRefTable(mock(), pack());
    expect(broken).toBe(0);
    expect(text).toContain('Ref table — a1-mock-fx (22 refs, all ✓; ↑ = inherited');
    expect(text).toMatch(/✓ rd\/rd02\s+passage\s+→ rd-01 · uxa1fx01r01-s02 · no audio/);
    expect(text).toMatch(/✓ ls\/ls02\s+audio↑\s+→ ls-01 · all 4 sentences · piper-lada/);
    expect(text).toMatch(/✓ sp\/sp46\s+prompt\s+→ ex-01 · uxa1fx01e01-s01 · piper-lada/);
  });
});

describe('broken exam fixtures — path-precise, file:line errors', () => {
  const broken = (name: string) => {
    const f = read(fixture('broken', name));
    return {
      issues: issuesOf(() => annotateDrafts([...storyFiles(), f])),
      source: f.source,
      path: f.path,
    };
  };

  it.each([
    [
      'exam-dangling-story.exam.md',
      'passage.storyId',
      'references unknown story "rd-99"',
      'storyId: rd-99',
    ],
    [
      'exam-noncontiguous-span.exam.md',
      'passage.sentenceIds[1]',
      'contiguous run in story order',
      'sentenceIds: [uxa1fx01r01-s01, uxa1fx01r01-s03]',
    ],
    [
      'exam-points-sum.exam.md',
      'maxPoints',
      'item points add up to 2 but subtest "s1" declares maxPoints 70',
      'maxPoints: 70',
    ],
    [
      'exam-answer-range.exam.md',
      'items.0.answer',
      'answer 2 is out of range for 2 options',
      'answer: 2',
    ],
    [
      'exam-speaking-in-reading.exam.md',
      'items.1.kind',
      'a reading subtest holds only choice / typed / matching items (item "sp01" is speaking-reply)',
      'kind: speaking-reply',
    ],
    [
      'exam-monologue-group-3.exam.md',
      'items.0.group',
      'monologue group "m1" has 3 members',
      'group: m1',
    ],
    [
      'exam-bullet-cue-punct.exam.md',
      'bullets.1.cues.0',
      'cue "живу!" must be letters/digits/spaces/hyphens only',
      "cues: ['живу!']",
    ],
    [
      'exam-matching-key.exam.md',
      'items.0.key.2',
      'right item 1 is matched twice',
      'key: [0, 1, 1]',
    ],
    [
      'exam-true-false-options.exam.md',
      'items.0.options',
      'a true-false item has exactly 2 options (found 3)',
      'variant: true-false',
    ],
  ])('%s', (name, pathPart, message, lineNeedle) => {
    const { issues, source, path } = broken(name);
    const hit = issues.find((i) => i.message.includes(pathPart) && i.message.includes(message));
    expect(hit, issues.map((i) => i.message).join('\n')).toBeDefined();
    expect(hit!.file).toBe(path);
    expect(hit!.line).toBe(lineOf(source, (l) => l.includes(lineNeedle)));
  });

  it('exam-half-voiced.pack.json: validate names every audio/prompt ref whose story has no track', () => {
    const result = runValidate(fixture('broken', 'exam-half-voiced.pack.json'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const lines = result.issues.map((i) => `${i.path}: ${i.message}`);
    // ls-01 has no track; every audio ref to it is named — listening (mock + drill) AND speaking prompts none (ex-01 is voiced).
    expect(lines).toHaveLength(4);
    expect(lines.every((l) => l.includes('story "ls-01"') && l.includes('has none'))).toBe(true);
    expect(lines.map((l) => l.match(/item "(\w+)"/)![1])).toEqual(['ls01', 'ls05', 'ls01', 'ls05']);
  });
});

describe('CLI + publish on the exam fixture', () => {
  const tsxCli = require.resolve('tsx/cli');
  const cli = (args: string[], expectFail = false) => {
    try {
      return {
        code: 0,
        out: execFileSync(process.execPath, [tsxCli, join(pkgDir, 'src', 'cli.ts'), ...args], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      };
    } catch (e) {
      const err = e as { status: number; stdout: string; stderr: string };
      if (!expectFail) throw e;
      return { code: err.status, out: `${err.stdout}${err.stderr}` };
    }
  };

  it('validate prints the four reports; the fixture mock has zero ⚠ and exits 0', () => {
    const result = cli(['validate', fixturePackPath]);
    expect(result.code).toBe(0);
    expect(result.out).toContain('valid pack "a1-ukrexam-fixture" v1');
    expect(result.out).toContain('Matrix map — «Зразок A1 (тест)»');
    expect(result.out).toContain('Topic census — a1-mock-fx (13 topics)');
    expect(result.out).toContain('✓ official shape (ukr-state A1 mock, modelled');
    expect(result.out).not.toContain('⚠');
    expect(result.out).toContain('Ref table — a1-mock-fx (22 refs, all ✓');
  });

  it('annotate prints the exam count + reports; a broken draft exits 1 with file:line', () => {
    const dir = mkdtempSync(join(tmpdir(), 't67-cli-'));
    try {
      const drafts = fixtureFiles().map((f) => f.path);
      const result = cli(['annotate', ...drafts, '-o', join(dir, 'pack.json')]);
      expect(result.out).toMatch(/3 stories, 11 sentences, \d+ tokens \+ 6 exams — schema-valid/);
      expect(result.out).toContain('Official shape — lg-g19: not checked');
      const bad = fixture('broken', 'exam-dangling-story.exam.md');
      const fail = cli(
        [
          'annotate',
          join(fxDir, 'rd-01.draft.md'),
          join(fxDir, 'ls-01.draft.md'),
          bad,
          '-o',
          join(dir, 'x.json'),
        ],
        true,
      );
      expect(fail.code).toBe(1);
      expect(fail.out).toContain(
        `${bad}:${lineOf(readFileSync(bad, 'utf8'), (l) => l.includes('rd-99'))}:`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('publish against a scratch content repo: type exam + category ukr-exam-a1; pack.json, audio and the photo', () => {
    const dir = mkdtempSync(join(tmpdir(), 't67-publish-'));
    try {
      const git = (...args: string[]) =>
        execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
      git('init', '-q');
      git('config', 'user.email', 'test@example.com');
      git('config', 'user.name', 'T67 Test');
      writeFileSync(
        join(dir, 'manifest.json'),
        `${JSON.stringify({ schemaVersion: 1, packs: [] })}\n`,
      );
      git('add', 'manifest.json');
      git('commit', '-qm', 'init');

      const summary = runPublish(join(fixturePackPath, '..'), dir);
      expect(summary.outcome).toBe('published');
      expect(summary.files.map((f) => f.path).sort()).toEqual([
        'audio/ex-01.opus',
        'audio/ls-01.opus',
        'images/photo-01.png',
        'pack.json',
      ]);
      const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
      expect(Object.keys(manifest.packs[0]).sort()).toEqual(
        ['bytes', 'category', 'files', 'id', 'level', 'title', 'type', 'version'].sort(),
      );
      expect(manifest.packs[0]).toMatchObject({
        id: 'a1-ukrexam-fixture',
        version: 1,
        type: 'exam',
        category: 'ukr-exam-a1',
        level: 'A1',
      });
      expect(runPublish(join(fixturePackPath, '..'), dir).outcome).toBe('unchanged');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
