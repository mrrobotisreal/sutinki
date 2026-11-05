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
- All analytics are local (SQLite `analytics_events`); nothing reports to any
  third party, ever.

## 5. Switching between dev and release installs

Debug-signed (dev client) and release-signed builds cannot update over each
other. To switch: Settings → Backup → **Export to file** (or Back up now),
uninstall, install the other build, then §3 with the exported file. Same
`versionCode` rules as README "Versioning scheme". The S25 always ends a ticket
on the signed release build, never the dev client.
