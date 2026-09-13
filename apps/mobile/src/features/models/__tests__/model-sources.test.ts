import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MIRROR_MODELS } from '@sutinki/pipeline';
import type { ModelsManifest } from '@sutinki/schema';
import { describe, expect, it } from 'vitest';

import { planModelSources } from '@/features/models/resolver-core';
import { ASR_MODEL } from '@/features/pronunciation/asr-catalog';
import { PIPER_VOICES } from '@/features/tts/catalog';

/**
 * T23 pin tests: the content-repo mirror (pipeline MIRROR_MODELS →
 * models-manifest.json) and the app catalogs' k2-fsa fallback constants
 * must claim the SAME sha256/bytes/upstream URL per model id — a drifted
 * pair would make one source unverifiable. Plus the shared-resolver wiring
 * proof: both managers install through features/models, not private copies.
 */

describe('mirror ↔ catalog pins', () => {
  it('covers exactly the TTS catalog: 2 Piper uk_UA voices, no ASR row (UT06)', () => {
    const mirrorIds = MIRROR_MODELS.map((m) => m.id).sort();
    const catalogIds = PIPER_VOICES.map((v) => v.id).sort();
    expect(mirrorIds).toEqual(catalogIds);
  });

  it('both sources claim the same sha256/bytes/upstream URL per voice id', () => {
    for (const voice of PIPER_VOICES) {
      const mirror = MIRROR_MODELS.find((m) => m.id === voice.id);
      expect(mirror, voice.id).toBeDefined();
      expect(mirror!.kind).toBe('tts-voice');
      expect(mirror!.sha256).toBe(voice.archiveSha256);
      expect(mirror!.bytes).toBe(voice.archiveBytes);
      expect(mirror!.upstreamUrl).toBe(voice.archiveUrl);
      expect(mirror!.displayName).toBe(voice.displayName);
    }
  });

  // UT06 / ADR-0005: the Ukrainian ASR archive is > 100 MB, so it has NO
  // mirror row by design — the catalog says so (`mirrored: false`) and the
  // resolver's upstream-only plan is the intended install path, not a
  // degraded one. A future ASR mirror must flip both sides together.
  it('the ASR model is deliberately unmirrored (> 100 MB) and the resolver plans upstream-only', () => {
    expect(ASR_MODEL.mirrored).toBe(false);
    expect(ASR_MODEL.archiveBytes).toBeGreaterThan(100 * 1024 * 1024);
    expect(MIRROR_MODELS.find((m) => m.id === ASR_MODEL.id)).toBeUndefined();
    const manifest: ModelsManifest = {
      schemaVersion: 1,
      generatedAt: '2026-09-13T00:00:00.000Z',
      models: MIRROR_MODELS.map((m) => ({
        id: m.id,
        kind: m.kind,
        file: `models/tts/${m.upstreamUrl.split('/').pop()!}`,
        bytes: m.bytes,
        sha256: m.sha256,
        displayName: m.displayName,
      })),
    };
    expect(
      planModelSources(
        {
          id: ASR_MODEL.id,
          fallbackUrl: ASR_MODEL.archiveUrl,
          sha256: ASR_MODEL.archiveSha256,
          bytes: ASR_MODEL.archiveBytes,
        },
        manifest,
      ),
    ).toEqual([
      {
        source: 'upstream-fallback',
        url: ASR_MODEL.archiveUrl,
        sha256: ASR_MODEL.archiveSha256,
        bytes: ASR_MODEL.archiveBytes,
      },
    ]);
  });
});

describe('shared resolver wiring', () => {
  const read = (rel: string) => readFileSync(join(__dirname, '../../../..', 'src', rel), 'utf8');

  it('both managers install through the ONE shared resolver, not private copies', () => {
    for (const manager of ['features/tts/manager.ts', 'features/pronunciation/asr-manager.ts']) {
      const source = read(manager);
      expect(source, manager).toContain("from '@/features/models/install-source'");
      expect(source, manager).toContain('resolveModelDownloadSpecs');
      expect(source, manager).toContain('downloadModelArchive');
      expect(source, manager).toContain('assertModelDownloadAllowed');
      // The pre-T23 private download path is gone from the managers: the
      // stream-download + hash-verify now lives only in install-source.
      expect(source, manager).not.toContain('createDownloadResumable');
      expect(source, manager).not.toContain('sha256File');
    }
  });
});
