/**
 * UT15 benchmark: score published stamps (old) and the restamp produced from precomputed aligner outputs
 * (`<dir>/<pack>__<track>.json`, forced_align.py --jobs output) against the frozen INDEPENDENT truth set
 * (Whisper large-v3 + energy edges; never the aligner's own output).
 * Usage: tsx tools/bench.ts <content-dir> <truth.json> <align-dir> [--seed-step MS] [--json out.json]
 *   --seed-step: add a +MS step to every old stamp after the track midpoint (defect seeding for the dry run).
 * Prints per class/kind: n, median, p90 |Δ|, and the fraction of new stamps <= 100 ms long.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { safeParsePack } from '@sutinki/schema';
import {
  analyseTrack,
  auditTrack,
  restampTrack,
  type AlignedWord,
} from '../src/stamp-audit.ts';

interface B {
  pack: string;
  track: string;
  id: string;
  kind: 'start' | 'end';
  ms: number;
  class: 'P' | 'W';
}
const [content, truthFile, alignDir, ...rest] = process.argv.slice(2);
const opt = (k: string) => (rest.includes(k) ? rest[rest.indexOf(k) + 1] : undefined);
const seed = opt('--seed-step') ? Number(opt('--seed-step')) : 0;
const truth = JSON.parse(readFileSync(truthFile!, 'utf8')) as {
  tracks: Record<string, unknown>;
  boundaries: B[];
};
const med = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : NaN;
};
const p90 = (v: number[]) => {
  const s = v.map(Math.abs).sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.9))]! : NaN;
};
type Acc = Record<string, number[]>;
const acc: Record<'old' | 'new', Acc> = { old: {}, new: {} };
const push = (w: 'old' | 'new', k: string, v: number) => (acc[w][k] ??= []).push(v);
let short = 0;
let total = 0;
let shortOld = 0;
let totalOld = 0;
const tracks: { track: string; old: unknown; new: unknown }[] = [];
for (const key of Object.keys(truth.tracks)) {
  const [pack, tid] = key.split(':') as [string, string];
  const dir = join(content!, 'packs', pack);
  const parsed = safeParsePack(JSON.parse(readFileSync(join(dir, 'pack.json'), 'utf8')));
  if (!parsed.success) throw new Error(`${pack} invalid`);
  for (const story of parsed.data.stories) {
    for (const tr of story.audio) {
      if (tr.id !== tid) continue;
      const out = JSON.parse(readFileSync(join(alignDir!, `${pack}__${tid}.json`), 'utf8')) as {
        words: AlignedWord[];
      };
      let track = tr;
      if (seed) {
        const mid = tr.durationMs / 2;
        track = {
          ...tr,
          timestamps: tr.timestamps.map((t) =>
            t.startMs > mid ? { ...t, startMs: t.startMs + seed, endMs: t.endMs + seed } : t,
          ),
        };
      }
      const w = analyseTrack(dir, story.id, track, story.sentences, () => out.words);
      const stamps = restampTrack(story.sentences, w.refined);
      const o = new Map(track.timestamps.map((t) => [`${t.sentenceId}:${t.tokenIndex}`, t]));
      const n = new Map(stamps.map((t) => [`${t.sentenceId}:${t.tokenIndex}`, t]));
      for (const b of truth.boundaries) {
        if (b.pack !== pack || b.track !== tid) continue;
        for (const [wh, m] of [['old', o], ['new', n]] as const) {
          const s = m.get(b.id);
          if (s) push(wh, `${b.class}-${b.kind}`, (b.kind === 'start' ? s.startMs : s.endMs) - b.ms);
        }
      }
      for (const s of track.timestamps) {
        totalOld++;
        if (s.endMs - s.startMs <= 100) shortOld++;
      }
      for (const s of stamps) {
        total++;
        if (s.endMs - s.startMs <= 100) short++;
      }
      tracks.push({
        track: tid,
        old: auditTrack(track, story.sentences, w.refined, w.db),
        new: auditTrack({ ...track, timestamps: stamps }, story.sentences, w.refined, w.db),
      });
    }
  }
}
const row: Record<string, unknown> = {};
for (const wh of ['old', 'new'] as const) {
  for (const k of Object.keys(acc[wh]).sort()) {
    const v = acc[wh][k]!;
    row[`${wh} ${k}`] = { n: v.length, med: Math.round(med(v)), absMed: Math.round(med(v.map(Math.abs))), p90: Math.round(p90(v)) };
  }
}
const frac = total ? short / total : 0;
console.log(JSON.stringify({ ...row, 'new stamps<=100ms': +frac.toFixed(4), 'old stamps<=100ms': +(shortOld / Math.max(1, totalOld)).toFixed(4), seed }, null, 1));
if (opt('--json')) writeFileSync(opt('--json')!, JSON.stringify({ row, frac, tracks }, null, 1));
