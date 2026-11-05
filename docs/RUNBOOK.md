# Сутінки — Runbook

Operational how-tos for the things done rarely enough to forget. Rewritten for
Sutinki in UT09 (§1–§2 followed verbatim as a test). Dev/release build mechanics live in the
repo [README](../README.md); this file covers content, voices, restore, and
diagnostics.

---

## 1. Add new content (a story pack)

Prereqs: repo installed (`pnpm install`), `ffmpeg` on PATH, the ElevenLabs key
in the environment (never printed, never committed — see the voices note below),
and a local clone of the content repo as a **sibling of this repo**
(`../sutinki-content`, i.e. the `sutinki-content` directory at the workspace
root).

1. **Author the draft(s).** One markdown file per story; a pack with N stories =
   N drafts sharing identical `pack:` frontmatter. Each sentence block carries a
   **`UK:`** line (the Ukrainian sentence), an `EN:` line, an optional `GRAMMAR:`
   line (tags from the Ukrainian canon) and the 7-column token table. The
   complete grammar (frontmatter, sentence blocks, token table, apostrophe rule,
   voice direction) is `packages/pipeline/docs/AUTHORING.md` — a fresh Claude
   session can author from that doc alone. Story sources live in
   `../Stories/<Family>/A1/` (workspace convention), e.g.
   `../Stories/IHaveNoMouthAndIMustScream/A1/no-mouth-uk-a1.md`; per-pack
   scratch lives in `../Stories/_build/<pack-id>/`. Try the pipeline on the
   repo's own fixture first: `packages/pipeline/fixtures/the-photograph.draft.md`.
2. **Annotate & validate** (from the `Sutinki` repo root):
   ```sh
   env -u NODE_OPTIONS pnpm pipeline annotate path/to/story1.draft.md path/to/story2.draft.md -o /tmp/pack-check.json
   env -u NODE_OPTIONS pnpm pipeline validate /tmp/pack-check.json
   ```
   Fix any `file:line:` errors until both exit 0. (Course-unit / checkpoint /
   prompts extras ride along via `--extras <file>` — see AUTHORING.md.)
3. **Render narration** (Eleven v4, the cast in `docs/design/VOICE_CAST.md` at
   the workspace root; credit preflight and the render-slot locks of
   `docs/design/RENDER_BUDGET.md` apply — content tickets own this step). First
   audition takes (never touches pack.json):
   ```sh
   env -u NODE_OPTIONS pnpm pipeline audio path/to/*.draft.md -o ../Stories/_build/<pack-id> --audition 3
   ```
   Listen to `../Stories/_build/<pack-id>/audition/*.mp3`, pick a seed per
   track, then finalize:
   ```sh
   env -u NODE_OPTIONS pnpm pipeline audio path/to/*.draft.md -o ../Stories/_build/<pack-id> \
     --seed <track-id>=<seed> [--seed <track-id-2>=<seed>…]
   ```
   Check the printed stamp report: every track should say monotonic, ~100%
   coverage. A 0-stamp track falls back to sentence karaoke in the app —
   re-render with another seed instead of shipping that.
4. **Publish** (commits into the content repo; `--push` is opt-in and follows
   ADR-0013: publish lock held, `git pull --rebase` first, never force):
   ```sh
   env -u NODE_OPTIONS pnpm pipeline publish ../Stories/_build/<pack-id> --content ../sutinki-content --push
   ```
   Updating an existing pack: bump `pack.version` in every draft first —
   publish refuses same-version content drift.
5. **Sync on the phone.** Settings → Content sync must have the repo
   (`mrrobotisreal/sutinki-content`) and a fine-grained PAT (Contents:
   read-write) saved. Then Library → pull-to-refresh (or Packs → Check for
   updates). Audio can defer to Wi-Fi per the Wi-Fi-only toggle.

> Voices note: the pipeline currently reads `ELEVENLABS_API_KEY` (inherited);
> Sutinki's policy key is `ELEVENLABS_API_KEY_2` and the pipeline switches to it
> with the v4 gate in UP03. Until then a render ticket exports the policy key's
> value under the name the CLI reads, for that shell only.

**Variant — a non-fiction pack (news / education / podcast / documentary /
travel, M14 / ADR-0016).** Same five steps, with three differences:

- **Frontmatter** (AUTHORING.md "Frontmatter" + "Non-fiction registers"):
  `pack.category: news` (one shelf per pack), each `story.source:` (`name`
  always, `publishedAt: YYYY-MM-DD` for anything dated, `url`/`author` when
  they exist) and `story.subtitle:` when the source has a dek; the `voice:`
  block names `register: anchor` (news) / `lecturer` / `host` / `voiceover` /
  `guide` and **omits `voice:`/`style:`** — the default voice `Mr. Wintrow` on
  `eleven_multilingual_v2` + `language_code ru` is filled in by the register.
  Fiction packs name `category: stories` + `genre:` and `register: narrator`.
  The pre-render summary prints the resolved model / voice / style per track
  before anything fires — check it says `eleven_multilingual_v2 … Mr. Wintrow`.
- **Anthology packs grow by appending**: one open-ended pack per shelf and
  rung (`a2-news-001`, `a2-edu-001`, `a2-podcast-001`, `a2-doc-001`,
  `a2-travel-001`). A new item = a new draft passed **after** the existing
  drafts, `pack.version` bumped in every draft, the same `_build/<pack-id>`
  dir (so earlier opus files are carried), `--stories <new-id>` on the audio
  run; never reorder or re-id old items (the SAR-stories rule,
  `../sumrak-content/series/sar-stories/SERIES.md` §2).
- **Publish** as usual; the manifest entry now carries `category`, which the
  app's Библиотека shelves read (T44–T45).

## 2. Add a TTS voice or the ASR model

Everything is on-device and on-demand; nothing ships in the APK.

- **TTS voice**: Settings → Голоси → «Завантажити» (Лада, ~26 MB, one speaker;
  or the three-speaker Лада · Микита · Тетяна voice, ~80 MB — each speaker is its
  own row once installed), sha256-verified from the `sutinki-content` mirror
  (`models/tts/`, indexed by `models-manifest.json`) or, if the mirror is
  unreachable, the pinned public k2-fsa release asset. Select the active
  voice/speaker in the same section; delete any voice to reclaim its storage. At
  zero installed voices the app silently falls back to the Android system
  Ukrainian (`uk-UA`) voice — install Google TTS Ukrainian if the phone has none.
- **ASR model** (pronunciation practice): Settings → Speech recognition →
  download (the Ukrainian NeMo transducer, ~106 MB). It exceeds GitHub's 100 MB
  per-file limit, so the mirror does not carry it: the app installs it from the
  upstream k2-fsa release asset (ADR-0005) — do this on Wi-Fi. Delete/re-install
  any time; the pronunciation game gates itself with a "model needed" state.
- Both download over the network once and then work fully offline.
- Refresh the mirror (maintainers): `env -u NODE_OPTIONS pnpm pipeline models mirror --content ../sutinki-content [--push]`.

## 3. Restore from backup

Backups are encrypted snapshots of **user data only** (word bank, reviews,
journal, progress, settings — never content packs, never secrets). Sources:
GitHub (`sutinki-content/backups/`), the home server (`SutinkiAPI`'s `syncd`,
`https://sutinki.winapps.dev` once UT08b has published it), or a local
exported file.

On a fresh install (or after data loss):

1. Open the app → Settings → **Restore from backup** (also reachable before
   any backup passphrase is configured).
2. Pick the source: GitHub (needs the PAT — on a truly fresh install the
   default repo is baked in), Home server (needs host + token saved in the
   syncd card), or Local file (SAF picker).
3. Pick the snapshot (newest first) and enter the **backup passphrase**. Key
   derivation takes ~11 s on-device — that's normal (PBKDF2, 210k iterations).
   A wrong passphrase fails cleanly; nothing is touched.
4. The restore replaces user tables in one transaction, reconciles installed
   packs against the snapshot's sync state, and auto-triggers a content sync
   to re-download anything missing.
5. **Post-restore checklist** (secrets and OS grants do not travel in
   backups, by design):
   - Re-enter the GitHub PAT (Settings → Content sync) if sync shows
     "not configured". (Secrets live in the Android Keystore-backed secure
     store under `sutinki.*` keys — `sutinki.sync.github.pat`,
     `sutinki.ai.openrouter.key`, `sutinki.backup.key`,
     `sutinki.backup.syncd.token`; none of them travels in a backup.)
   - Re-enter the OpenRouter key (Settings → AI) for journal feedback /
     enrichment / assessment.
   - Re-grant notifications (Settings → Notifications master toggle) — a
     wiped install loses the OS permission.
   - Re-download TTS voices / the ASR model (§2) — model files are not part
     of user data.
   - If the Keystore alias died with the wipe, the backup card shows
     "Re-enter your passphrase" — doing so re-derives and re-caches the key.

## 4. Diagnostics

- **Error log**: Settings → Diagnostics → Error log. Everything the crash
  guard, global JS handler, and DB bootstrap catch lands there (on-device
  file, newest first, capped at 200). "Throw a test error" proves the crash
  guard end-to-end: the app shows the recovery screen instead of dying, and
  the error appears in the log.
- **DB debug** (dev builds only): Settings → Developer → Database debug.
  Its «Fixture packs (M14)» buttons (T44) import the M14 test packs
  `a2-news-090` / `a2-podcast-090` / `a1-comedy-090` from `@sumrak/schema`
  fixtures — a newspaper article with subtitle + source, a podcast episode,
  and a comedy story — so the category chips, reader header source line and
  badges can be exercised without a content sync (idempotent; re-tap shows
  `unchanged`). Remove them via the packs screen like any installed pack.
- All analytics are local (SQLite `analytics_events`); nothing reports to any
  third party, ever.

## 5. Switching between dev and release installs

Debug-signed (dev client) and release-signed builds cannot update over each
other. To switch: Settings → Backup → **Export to file** (or Back up now),
uninstall, install the other build, then §3 with the exported file. Same
`versionCode` rules as README "Versioning scheme". The S25 always ends a ticket
on the signed release build, never the dev client.
`versionCode` rules as README "Versioning scheme".

## 6. Themed study soundtracks

The five study-ambience themes (`horror` default · `news` · `comedy` ·
`action` · `education`) are Opus beds bundled in the APK under
`apps/mobile/assets/audio/ambient/<theme>/` and listed in the hand-written
registry `apps/mobile/src/features/ambient-audio/beds.ts` (design
`docs/design/AMBIENT_SOUNDTRACKS.md`, ADR-0017). Which theme a pack gets is
`resolveAmbientTheme(classifyPack(pack))` in `theme.ts`: `news` /
`education` by category, `comedy` / `action` by genre under `stories`,
everything else (other genres, podcasts, travel, dialogues, games, review)
→ `horror`.

**Re-encode** (after replacing or adding a master):

```sh
export PATH="/opt/homebrew/bin:$PATH"   # ffmpeg + ffprobe from Homebrew
pnpm --filter sumrak-mobile encode:ambient            # skips unchanged masters (sha256)
pnpm --filter sumrak-mobile encode:ambient -- --force  # re-encode everything
```

- **Masters** live outside the repo in the workspace-root `assets/audio/`
  (`../assets/audio` from the `Sumrak` repo root): the Suno WAVs plus
  `creepy-bg-music-no-vocals.mp3` for horror. The theme → file table is the
  `SOURCES` constant at the top of `apps/mobile/scripts/encode-ambient-beds.mjs`.
- **−26 LUFS / −2 dBTP** is the level every bed is normalised to. It equals the
  original horror bed's measured loudness, so the volume slider's 20 % default
  means the same thing for every theme and the horror experience did not
  change. Don't "fix" it to −23 or −16.
- The script rewrites `assets/audio/ambient/beds.json`; a new or renamed bed
  also needs its `require()` in `sources.ts` and a row in `beds.ts`
  (`beds.test.ts` fails until both agree with the ledger). Commit the `.opus`
  files as plain files (no LFS).

**Add a bed** to an existing theme: drop the master into `../assets/audio/`,
append its file name to that theme's list in `SOURCES` (a `{ file, slug,
title }` object when the slug should differ from the file name), run
`encode:ambient`, then add the `require()` to `sources.ts` and the
`{ slug, title, durationMs, source }` row to `beds.ts` — `durationMs` is the
ledger's value. `pnpm test` (`beds.test.ts`) fails until all three agree.
Rotation order = array order; append at the end so nobody's cursor moves.

**Add a theme**: a new `AmbientThemeId` member + `AMBIENT_THEMES` entry +
`AMBIENT_THEME_ORDER` slot in `beds.ts`, a row in the script's `SOURCES`, a
branch in `resolveAmbientTheme` (`theme.ts`), and its icon in
`SOUNDTRACK_ICONS` (`soundtracks.ts`). Nothing else knows the theme list —
the engine, cursors and the Settings list all iterate the registry.

**Cursors.** Each theme's resume point lives in the `settings` table under
`audio.ambientCursors` as `{ "<theme>": { "bed": "<slug>", "positionMs": N } }`.
Themes absent from the blob start on bed 1 at 0; a cursor inside the last
5 s of a bed starts the *next* bed. Clear one theme with Settings →
Background music → Soundtracks → **Reset** (also restarts a live preview),
or clear all with `DELETE FROM settings WHERE key = 'audio.ambientCursors'`
from the dev DB screen / `run-as` sqlite. Listening in Settings (▶ preview)
is a real activity — the cursor advances just as it would while reading.

**Ducking (T41).** When per-story soundscapes arrive they play on a second
player and must duck this bed to 0 for the story's duration (design §9).

## 7. Word forms & lessons (M16 — filled by T55)

Stub. Design: `<workspace>/docs/design/WORD_FORMS_AND_LESSONS.md` (ADR-0018).
T55 writes this section: the «Grammar & word forms» preset, receipts, the
batch («Generate forms for N words»), fixture re-capture, the model-table
edit path and measured cost expectations.
