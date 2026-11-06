import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { Pack, Sentence } from '@sutinki/schema';
import {
  assertOnlyTimestampsChanged,
  auditPack,
  lemmaLint,
  defaultEngine,
  pythonAligner,
  runStampAudit,
  STAMP_AUDIT_SKIPPED,
  loadFrameDb,
  refineWords,
  pauseEdges,
  restampPack,
  structuralChecks,
  type AlignedWord,
  type Aligner,
} from '../src/stamp-audit.ts';
import { runPublish } from '../src/publish.ts';

/**
 * T80: stamp-audit / restamp on a synthetic track. Every "word" is a 250 ms
 * 300 Hz burst, 400 ms apart, so the true word times are known exactly; the
 * fake aligner returns them with a chosen error (step / drift / constant) and
 * the audit must flag exactly the bad ones.
 */

const dirs: string[] = [];
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

const N = 120;
const PERIOD = 400;
const BURST = 250;
const trueStart = (i: number) => 500 + i * PERIOD;

const sentences: Sentence[] = Array.from({ length: N / 6 }, (_, s) => ({
  id: `t-s${String(s + 1).padStart(2, '0')}`,
  uk: Array.from({ length: 6 }, (_, k) => `слово${s * 6 + k}`).join(' ') + '.',
  en: 'x',
  tokens: [
    ...Array.from({ length: 6 }, (_, k) => ({
      text: `слово${s * 6 + k}`,
      lemma: 'слово',
      spaceBefore: k > 0,
    })),
    { text: '.', isPunct: true as const },
  ],
}));

function makeAudio(): { dir: string; file: string; durationMs: number } {
  const dir = mkdtempSync(join(tmpdir(), 'sutinki-t80sa-'));
  dirs.push(dir);
  const durationMs = trueStart(N) + 500;
  // gated sine, one burst per word. Compact periodic form (ffmpeg 9 rejects a 120-term sum with ENOMEM).
  const t0 = trueStart(0) / 1000;
  const gate = `gte(t,${t0})*lt(t,${t0 + (N * PERIOD) / 1000})*lt(mod(t-${t0},${PERIOD / 1000}),${BURST / 1000})`;
  execFileSync('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-f',
    'lavfi',
    '-i',
    `aevalsrc='0.5*sin(2*PI*300*t)*(${gate})':s=16000:d=${durationMs / 1000}`,
    '-c:a',
    'libopus',
    '-b:a',
    '32k',
    join(dir, 'a.opus'),
  ]);
  return { dir, file: 'a.opus', durationMs };
}

function packWith(
  durationMs: number,
  stamps: { startMs: number; endMs: number }[],
  extra: Partial<Sentence>[] = [],
): Pack {
  const words = sentences.flatMap((s) =>
    s.tokens.flatMap((t, i) => (t.isPunct ? [] : [{ sentenceId: s.id, tokenIndex: i }])),
  );
  return {
    id: 'test-stamps',
    version: 1,
    type: 'stories',
    title: { uk: 'Т', en: 'T' },
    level: 'A1',
    tags: [],
    stories: [
      {
        id: 'story',
        title: { uk: 'Т', en: 'T' },
        level: 'A1',
        sentences: sentences.map((s, i) => ({ ...s, ...(extra[i] ?? {}) })),
        audio: [
          {
            id: 'trk',
            voice: 'elevenlabs:Test',
            style: 'plain',
            file: 'a.opus',
            durationMs,
            timestamps: words.map((w, i) => ({ ...w, ...stamps[i]! })),
          },
        ],
      },
    ],
  } as unknown as Pack;
}

/** Fake aligner = the true word times, then `skew(i, t)` applied (alignment error). */
const alignerWith =
  (skew: (i: number, t: number) => number): Aligner =>
  (_f, words) =>
    words.map((w, i) => {
      const s = trueStart(i);
      return {
        id: w.id,
        startMs: Math.round(skew(i, s)),
        endMs: Math.round(skew(i, s) + BURST - 40), // peaky/early end like CTC
        aligned: true,
      };
    });

const published = (f: (i: number) => number) =>
  Array.from({ length: N }, (_, i) => ({
    startMs: Math.round(f(i)),
    endMs: Math.round(f(i) + BURST - 20),
  }));

describe('stamp-audit on a synthetic track', () => {
  const { dir, durationMs } = makeAudio();

  it('passes stamps that match the audio', () => {
    const pack = packWith(durationMs, published(trueStart));
    const audit = auditPack(
      pack,
      dir,
      alignerWith((_, t) => t),
    );
    const t = audit.tracks[0]!;
    expect(t.failures).toEqual([]);
    expect(Math.abs(t.medianMs)).toBeLessThanOrEqual(10);
    expect(audit.ok).toBe(true);
  });

  it('flags a +1.8 s STEP after word 40 (the sr1/rw5 shape)', () => {
    const pack = packWith(
      durationMs,
      published((i) => trueStart(i) - (i >= 40 ? 1800 : 0)),
    );
    const t = auditPack(
      pack,
      dir,
      alignerWith((_, t) => t),
    ).tracks[0]!;
    expect(t.ok).toBe(false);
    expect(t.maxStepMs).toBeGreaterThan(1500);
    expect(t.failures.join(' ')).toMatch(/step/);
  });

  it('flags linear DRIFT (stamps −60 ms/min late) even when the median is small', () => {
    const pack = packWith(
      durationMs,
      published((i) => trueStart(i) + (i * PERIOD * 0.06) / 60),
    );
    const t = auditPack(
      pack,
      dir,
      alignerWith((_, t) => t),
    ).tracks[0]!;
    expect(t.driftMsPerMin).toBeLessThan(-20);
    expect(t.failures.join(' ')).toMatch(/drift/);
  });

  it('flags a constant 120 ms offset by the median threshold', () => {
    const pack = packWith(
      durationMs,
      published((i) => trueStart(i) + 120),
    );
    const t = auditPack(
      pack,
      dir,
      alignerWith((_, t) => t),
    ).tracks[0]!;
    expect(t.failures.join(' ')).toMatch(/median offset/);
  });

  it('flags end-clipped stamps (end before the voiced tail)', () => {
    const clipped = Array.from({ length: N }, (_, i) => ({
      startMs: trueStart(i),
      endMs: trueStart(i) + 90, // word is voiced until +250
    }));
    const t = auditPack(
      packWith(durationMs, clipped),
      dir,
      alignerWith((_, t) => t),
    ).tracks[0]!;
    expect(t.endClipRate).toBeGreaterThan(0.5);
  });

  it('refineWords extends a peaky end to the true release and keeps monotonic order', () => {
    const db = loadFrameDb(join(dir, 'a.opus'));
    const aligned: AlignedWord[] = Array.from({ length: N }, (_, i) => ({
      id: `x:${i}`,
      startMs: trueStart(i) + 30, // late start, like CTC
      endMs: trueStart(i) + 120, // early end
      aligned: true,
    }));
    const r = refineWords(aligned, db, durationMs);
    let medStartErr = 0;
    let medEndErr = 0;
    r.forEach((w, i) => {
      medStartErr += Math.abs(w.startMs - trueStart(i));
      medEndErr += Math.abs(w.endMs - (trueStart(i) + BURST));
      if (i > 0) expect(w.startMs).toBeGreaterThanOrEqual(r[i - 1]!.endMs);
    });
    expect(medStartErr / N).toBeLessThan(25);
    expect(medEndErr / N).toBeLessThan(40);
  });

  it('restamp: after-audit passes and ONLY timestamps change (identity asserted)', () => {
    const pack = packWith(
      durationMs,
      published((i) => trueStart(i) - (i >= 40 ? 1800 : 0)),
    );
    const aligner = alignerWith((_, t) => t);
    const { pack: next, tracks } = restampPack(pack, dir, aligner);
    expect(tracks).toEqual(['trk']);
    expect(next.stories[0]!.sentences).toEqual(pack.stories[0]!.sentences);
    expect(auditPack(next, dir, aligner).ok).toBe(true);
    assertOnlyTimestampsChanged(pack, next);
    const tampered = structuredClone(next);
    tampered.title = { uk: 'другое', en: 'other' };
    expect(() => assertOnlyTimestampsChanged(pack, tampered)).toThrow(/more than/);
  });

  it('restamp is idempotent on correct stamps', () => {
    const pack = packWith(durationMs, published(trueStart));
    const aligner = alignerWith((_, t) => t);
    const once = restampPack(pack, dir, aligner).pack;
    const twice = restampPack(once, dir, aligner).pack;
    expect(twice).toEqual(once);
  });
});

describe('structural + lemma lint', () => {
  it('structuralChecks reports a sentence whose stamped indices skip a word token', () => {
    const s = sentences[0]!;
    const all = s.tokens.flatMap((t, i) => (t.isPunct ? [] : [i]));
    const stamps = all.slice(0, -1).map((tokenIndex, k) => ({
      sentenceId: s.id,
      tokenIndex,
      startMs: k * 100,
      endMs: k * 100 + 50,
    }));
    expect(structuralChecks([s], stamps)).toHaveLength(1);
    expect(
      structuralChecks(
        [s],
        all.map((tokenIndex, k) => ({
          sentenceId: s.id,
          tokenIndex,
          startMs: k * 100,
          endMs: k * 100 + 50,
        })),
      ),
    ).toEqual([]);
  });

  it('lemmaLint flags an adverb with an adjective lemma («ужасно» → «ужасный») and nothing else', () => {
    const mk = (text: string, lemma: string): Sentence =>
      ({ id: 'l-s01', uk: text, en: 'x', tokens: [{ text, lemma }] }) as unknown as Sentence;
    expect(lemmaLint([mk('ужасно', 'ужасный')], 'ru')).toHaveLength(1);
    expect(lemmaLint([mk('ужасно', 'ужасно')], 'ru')).toEqual([]);
    expect(lemmaLint([mk('ужасное', 'ужасный')], 'ru')).toEqual([]);
    expect(lemmaLint([mk('хорошо', 'хороший')], 'ru')).toHaveLength(1);
    expect(lemmaLint([mk('окно', 'окно')], 'ru')).toEqual([]);
  });
});

// Russian stamp-audit engine fixtures above — UT15 adds Ukrainian ones (allowlisted, owner UT15).
describe('UP07 audit modes (Ukrainian: report-only until UT15)', () => {
  const { dir, durationMs } = makeAudio();
  const bad = () =>
    packWith(
      durationMs,
      published((i) => trueStart(i) - (i >= 40 ? 1800 : 0)),
    );
  const aligner = alignerWith((_, t) => t);

  it('lemmaLint is empty for uk (default) and active for ru', () => {
    const s = { id: 'l-s01', uk: 'x', en: 'x', tokens: [{ text: 'ужасно', lemma: 'ужасный' }] };
    expect(lemmaLint([s as unknown as Sentence])).toEqual([]);
    expect(lemmaLint([s as unknown as Sentence], 'ru')).toHaveLength(1);
  });

  it('report mode never throws on a failing audit; enforce mode refuses', () => {
    const lines: string[] = [];
    const rep = runStampAudit('report', bad(), dir, aligner, (l) => lines.push(l));
    expect(rep.refuse).toBe(false);
    expect(rep.audit?.ok).toBe(false);
    expect(lines.join('\n')).toMatch(/report-only \(UT15 pending\)/);
    expect(runStampAudit('enforce', bad(), dir, aligner).refuse).toBe(true);
    expect(runStampAudit('off', bad(), dir, aligner).refuse).toBe(false);
  });

  it('report mode turns a missing aligner into the skipped line; enforce rethrows', () => {
    const boom: Aligner = () => {
      throw new Error('no venv');
    };
    const lines: string[] = [];
    expect(runStampAudit('report', bad(), dir, boom, (l) => lines.push(l)).skipped).toBe('no venv');
    expect(lines).toEqual([STAMP_AUDIT_SKIPPED]);
    expect(() => runStampAudit('enforce', bad(), dir, boom)).toThrow('no venv');
  });

  it('ctc-ru refuses Ukrainian input', () => {
    const a = pythonAligner({ engine: 'ctc-ru', python: '/nonexistent/python' });
    expect(() => a('x.opus', [{ id: 's:0', text: "п'ять" }])).toThrow(/cannot align Ukrainian/);
    expect(() => a('x.opus', [{ id: 's:0', text: 'ґанок' }])).toThrow(/cannot align Ukrainian/);
    // even plain-Cyrillic Ukrainian text is refused when the pack language is uk
    const b = pythonAligner({ engine: 'ctc-ru', language: 'uk', python: '/nonexistent/python' });
    expect(() => b('x.opus', [{ id: 's:0', text: 'вода' }])).toThrow(/cannot align Ukrainian/);
  });

  it('publish in report mode publishes a failing pack, notes it in BUILD_NOTES.md', () => {
    writeFileSync(join(dir, 'pack.json'), JSON.stringify(bad()));
    const c = mkdtempSync(join(tmpdir(), 'sutinki-up07pub-'));
    dirs.push(c);
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: c });
    execFileSync('git', ['config', 'user.email', 't@t'], { cwd: c });
    execFileSync('git', ['config', 'user.name', 't'], { cwd: c });
    writeFileSync(join(c, 'manifest.json'), `${JSON.stringify({ schemaVersion: 1, packs: [] })}\n`);
    execFileSync('git', ['add', '.'], { cwd: c });
    execFileSync('git', ['commit', '-q', '-m', 'i'], { cwd: c });
    const out = runPublish(dir, c, { stampAudit: aligner, stampAuditMode: 'report' });
    expect(out.outcome).toBe('published');
    expect(readFileSync(join(dir, 'BUILD_NOTES.md'), 'utf8')).toMatch(
      /report-only \(UT15 pending\)/,
    );
  });
});

describe('publish gate', () => {
  const { dir, durationMs } = makeAudio();
  const content = () => {
    const c = mkdtempSync(join(tmpdir(), 'sutinki-t80pub-'));
    dirs.push(c);
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: c });
    execFileSync('git', ['config', 'user.email', 't@t'], { cwd: c });
    execFileSync('git', ['config', 'user.name', 't'], { cwd: c });
    writeFileSync(join(c, 'manifest.json'), `${JSON.stringify({ schemaVersion: 1, packs: [] })}\n`);
    execFileSync('git', ['add', '.'], { cwd: c });
    execFileSync('git', ['commit', '-q', '-m', 'i'], { cwd: c });
    return c;
  };

  it('refuses a failing pack, logs --allow-stamp-risk, passes a restamped one', () => {
    const bad = packWith(
      durationMs,
      published((i) => trueStart(i) - (i >= 40 ? 1800 : 0)),
    );
    writeFileSync(join(dir, 'pack.json'), JSON.stringify(bad));
    const aligner = alignerWith((_, t) => t);
    expect(() => runPublish(dir, content(), { stampAudit: aligner })).toThrow(/stamp audit FAILED/);
    expect(existsSync(join(dir, 'BUILD_NOTES.md'))).toBe(false);

    const forced = runPublish(dir, content(), { stampAudit: aligner, allowStampRisk: true });
    expect(forced.outcome).toBe('published');
    expect(readFileSync(join(dir, 'BUILD_NOTES.md'), 'utf8')).toMatch(/--allow-stamp-risk/);

    const fixed = restampPack(bad, dir, aligner).pack;
    writeFileSync(join(dir, 'pack.json'), JSON.stringify(fixed));
    const ok = runPublish(dir, content(), { stampAudit: aligner });
    expect(ok.outcome).toBe('published');
  });
});

describe('T80b start-collapse fix (td1 «Ты» regression)', () => {
  // Frame-level synthetic track (5 ms frames): previous word voiced 400-900 ms, 1100 ms pause, «Ты» voiced
  // 2000-2900 ms, then a following word 3000-3400 ms. CTC is "peaky": it puts «Ты» only on its tail 2840-2900
  // (td1: raw 22640-22700 for a word whose energy starts ~21.5 s). Everything else is silence at -80 dB.
  const FR = 5;
  const total = 4000 / FR;
  const db = new Float64Array(total).fill(-80);
  const voice = (a: number, b: number) => {
    for (let f = a / FR; f < b / FR; f++) db[f] = -20;
  };
  voice(400, 900);
  voice(2000, 2900);
  voice(3000, 3400);
  const aligned: AlignedWord[] = [
    { id: 'p', startMs: 420, endMs: 880, aligned: true },
    { id: 'ty', startMs: 2840, endMs: 2900, aligned: true },
    { id: 'next', startMs: 3010, endMs: 3380, aligned: true },
  ];

  it('extends a collapsed sentence-initial start back to the energy onset (not into the previous word)', () => {
    const r = refineWords(aligned, db, 4000, [1, 2, 4]);
    expect(r[1]!.startMs).toBeGreaterThanOrEqual(1990);
    expect(r[1]!.startMs).toBeLessThanOrEqual(2020);
    expect(r[1]!.endMs - r[1]!.startMs).toBeGreaterThan(800); // not the 80 ms tail
    expect(r[1]!.startMs).toBeGreaterThanOrEqual(r[0]!.endMs);
    // words that were already right are unchanged
    expect(Math.abs(r[0]!.startMs - 400)).toBeLessThanOrEqual(25);
    expect(Math.abs(r[2]!.startMs - 3000)).toBeLessThanOrEqual(25);
  });

  it('never extends over the previous word (continuous speech keeps the CTC start)', () => {
    const cont = new Float64Array(total).fill(-20); // no pause at all
    const r = refineWords(aligned, cont, 4000, [1, 2, 4]);
    expect(r[1]!.startMs).toBeGreaterThanOrEqual(400 + 45 * 1);
    expect(r[1]!.startMs).toBeGreaterThanOrEqual(r[0]!.startMs + 45);
  });

  it('pauseEdges finds the audio onset/offset of the pause independently of any aligner', () => {
    const e = pauseEdges(db);
    const gap = e.find((p) => p.offMs < 1000 && p.onMs > 1500)!;
    expect(Math.abs(gap.offMs - 900)).toBeLessThanOrEqual(15);
    expect(Math.abs(gap.onMs - 2000)).toBeLessThanOrEqual(15);
  });
});

describe('keep-healthy-track policy', () => {
  it('restampPack leaves a track that already passes the audit byte-identical', () => {
    const { dir, durationMs } = makeAudio();
    const pack = packWith(durationMs, published(trueStart));
    const aligner = alignerWith((_, t) => t);
    const { pack: next, tracks, kept } = restampPack(pack, dir, aligner);
    expect(kept).toEqual(['trk']);
    expect(tracks).toEqual([]);
    expect(next.stories[0]!.audio[0]!.timestamps).toEqual(pack.stories[0]!.audio[0]!.timestamps);
  });

  it('keepHealthy:false forces a restamp', () => {
    const { dir, durationMs } = makeAudio();
    const pack = packWith(durationMs, published(trueStart));
    const { tracks } = restampPack(
      pack,
      dir,
      alignerWith((_, t) => t),
      { keepHealthy: false },
    );
    expect(tracks).toEqual(['trk']);
  });
});

// ─────────────────────────────── UT15 ───────────────────────────────
const FA = join(import.meta.dirname, '..', 'tools', 'forced_align.py');
/** Run forced_align.py's pure helpers under python3 -I (no torch needed). */
function py(code: string): unknown {
  const r = spawnSync(
    'python3',
    [
      '-I',
      '-c',
      `import importlib.util,json,sys\nsp=importlib.util.spec_from_file_location('fa',${JSON.stringify(FA)})\nfa=importlib.util.module_from_spec(sp);sp.loader.exec_module(fa)\n${code}`,
    ],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
}

describe('UT15 Ukrainian aligner (forced_align.py clean/interpolate, engine choice, env names)', () => {
  const clean = (w: string, apos: string | null = null, lang = 'uk') =>
    py(
      `print(json.dumps(fa.clean(${JSON.stringify(w)}, ${JSON.stringify(lang)}, ${apos === null ? 'None' : JSON.stringify(apos)})))`,
    );

  it('keeps ґ ї є і and never folds them to Russian letters', () => {
    expect(clean('Ґанок')).toBe('ґанок');
    expect(clean('їжак')).toBe('їжак');
    expect(clean('Європа')).toBe('європа');
    expect(clean('ліки')).toBe('ліки');
  });
  it('drops apostrophes when the model has no apostrophe token', () => {
    expect(clean("п'ять")).toBe('пять');
    expect(clean('м’ясо')).toBe('мясо');
    expect(clean('мʼясо')).toBe('мясо');
  });
  it('maps every apostrophe spelling to the model token', () => {
    expect(clean("п'ять", "'")).toBe("п'ять");
    expect(clean('м’ясо', "'")).toBe("м'ясо");
    expect(clean('мʼясо', '’')).toBe('м’ясо');
    expect(clean('обʼєкт', "'")).toBe("об'єкт");
  });
  it('strips hyphens, digits, Latin and punctuation: «по-перше» → «поперше»', () => {
    expect(clean('по-перше')).toBe('поперше');
    expect(clean('2026')).toBe('');
    expect(clean('Wi-Fi')).toBe('');
    expect(clean('«так»,')).toBe('так');
  });
  it('NFC-normalises decomposed input (й, ї)', () => {
    expect(clean('їжа')).toBe('їжа'); // і + U+0308
    expect(clean('мий')).toBe('мий'); // и + U+0306
  });
  it('--language ru keeps the upstream а–я/ё alphabet', () => {
    expect(clean('Ёлка', null, 'ru')).toBe('ёлка');
    expect(clean('їжак', null, 'ru')).toBe('жак');
  });
  it('words with no alignable letters are interpolated between aligned neighbours', () => {
    const out =
      py(`o=[{"id":"a","startMs":100,"endMs":300,"aligned":True},{"id":"b","startMs":0,"endMs":0,"aligned":False},{"id":"c","startMs":0,"endMs":0,"aligned":False},{"id":"d","startMs":700,"endMs":900,"aligned":True}]
fa.interpolate(o,1000)
print(json.dumps(o))`) as { id: string; startMs: number; endMs: number }[];
    expect(out[1]).toMatchObject({ startMs: 300, endMs: 500 });
    expect(out[2]).toMatchObject({ startMs: 500, endMs: 700 });
  });
  it('the apostrophe token is taken from the model vocab (ASCII, typographic, none)', () => {
    expect(py(`print(json.dumps(fa.apostrophe_token({"'":1,"а":2})))`)).toBe("'");
    expect(py(`print(json.dumps(fa.apostrophe_token({"’":1,"а":2})))`)).toBe('’');
    expect(py(`print(json.dumps(fa.apostrophe_token({"а":2})))`)).toBeNull();
  });
  it('engine follows the language: uk → ctc-uk, ru → ctc-ru', () => {
    expect(defaultEngine('uk')).toBe('ctc-uk');
    expect(defaultEngine('ru')).toBe('ctc-ru');
  });
  it('ctc-uk refuses Russian; ctc-ru needs language ru', () => {
    const u = pythonAligner({ engine: 'ctc-uk', language: 'ru', python: '/nonexistent/python' });
    expect(() => u('x.opus', [{ id: 's:0', text: 'вода' }])).toThrow(/Ukrainian only/);
  });
  it('cache key carries engine, language, model and revision', () => {
    const cache = mkdtempSync(join(tmpdir(), 'sutinki-ut15cache-'));
    dirs.push(cache);
    const audio = join(cache, 'a.bin');
    writeFileSync(audio, 'x');
    // a fake "python" that writes a valid aligner result to the --out argument
    const fake = join(cache, 'fakepy.sh');
    writeFileSync(
      fake,
      '#!/bin/sh\nwhile [ $# -gt 0 ]; do [ "$1" = --out ] && o="$2"; shift; done\n' +
        'echo \'{"engine":"x","words":[{"id":"s:0","startMs":1,"endMs":2,"aligned":true}]}\' > "$o"\n',
      { mode: 0o755 },
    );
    const words = [{ id: 's:0', text: 'вода' }];
    const run = (o: Parameters<typeof pythonAligner>[0]) =>
      pythonAligner({ python: fake, cacheDir: cache, ...o })(audio, words);
    const n = () => readdirSyncSafe(cache).filter((f) => /^[0-9a-f]{64}\.json$/.test(f)).length;
    run({ model: 'A' });
    expect(n()).toBe(1);
    run({ model: 'A' });
    expect(n()).toBe(1); // cache hit
    run({ model: 'B' });
    expect(n()).toBe(2);
    run({ model: 'A', revision: 'r2' });
    expect(n()).toBe(3);
    run({ model: 'A', engine: 'whisper' });
    expect(n()).toBe(4);
  });
  it('env names are SUTINKI_ALIGN_* (no SUMRAK_ALIGN in the aligner sources)', () => {
    const src = readFileSync(join(import.meta.dirname, '..', 'src', 'stamp-audit.ts'), 'utf8');
    for (const n of ['PYTHON', 'DEVICE', 'CACHE', 'MODEL', 'REVISION'])
      expect(src).toContain(`SUTINKI_ALIGN_${n}`);
    expect(src).not.toMatch(/SUMRAK_ALIGN/);
    expect(readFileSync(FA, 'utf8')).not.toMatch(/SUMRAK_ALIGN/);
  });
});

import { readdirSync } from 'node:fs';
function readdirSyncSafe(d: string): string[] {
  try {
    return readdirSync(d);
  } catch {
    return [];
  }
}
