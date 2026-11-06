# Authoring drafts for Сутінки (Sutinki)

**This document is self-contained.** If you are a Claude session asked to author a new Ukrainian story draft, everything you need is here: the draft file grammar, the annotation rules, the lemma conventions, the apostrophe rule, the grammar-tag canon, the gotchas, and a complete worked example. You do not need the app, the design doc, or network access — only this doc and the `pipeline` CLI.

Sutinki is the Ukrainian twin of Сумрак (Sumrak). The draft _format_ is Sumrak's with the target-language key renamed `ru` → `uk` end to end (ADR-0003): the sentence line is `UK:`, every bilingual field is `{ uk, en }`, and the text rules are Ukrainian (ADR-0004). A `RU:` line is an error, never silently accepted.

The _conventions_ in this document — level, sentence shape, lemma rules, tag names — are calibrated to the Ukrainian sources Mitch had authored to his specification (`UkrainianStories/*/A1/*_UK.md` and the `*.uk.draft.md` annotations), **not** to Sumrak's Russian rungs. Where this doc and a Sumrak habit disagree, this doc wins; where this doc and one of those sources disagree, the source wins and this doc gets fixed.

## What a draft is

A **draft** is one markdown file containing **one story**: its metadata, its sentences (Ukrainian + English), and a full token-by-token annotation table for every sentence. The pipeline turns drafts into a validated `pack.json` — the content format the Sutinki app imports. The pipeline **never invents content**: every word's dictionary form and gloss must be authored by you, and any gap stops the build with a `file:line:` error.

A **pack** is the unit the app installs. A pack with several stories = several draft files (one per story) that share identical `pack:` frontmatter, passed to the CLI together in reading order.

There is a second draft kind: **dialogue drafts** (one file = one branching dialogue) — see the [Dialogue drafts](#dialogue-drafts-dialoguemd) section below. Everything in the story sections (sentence blocks, alignment, lemma conventions, apostrophe rule, gotchas) applies to dialogue lines unchanged.

## Running the pipeline

From the `Sutinki` repo root, always with `env -u NODE_OPTIONS` in front (the workspace's global Node options break `tsx`):

```bash
# draft(s) → pack.json (validated against the shared Zod schema before writing)
env -u NODE_OPTIONS pnpm pipeline annotate path/to/story.draft.md -o path/to/pack.json

# multi-story pack: all drafts, in reading order
env -u NODE_OPTIONS pnpm pipeline annotate s1.draft.md s2.draft.md s3.draft.md -o pack.json

# validate an existing pack.json independently
env -u NODE_OPTIONS pnpm pipeline validate path/to/pack.json

# narration (needs ELEVENLABS_API_KEY_2 in the env or a gitignored .env at the
# repo root — the pipeline never prints the value). First audition:
env -u NODE_OPTIONS pnpm pipeline audio s1.draft.md s2.draft.md -o packs/my-pack --audition 3
# …listen to packs/my-pack/audition/*.mp3, pick a seed per track, finalize:
env -u NODE_OPTIONS pnpm pipeline audio s1.draft.md s2.draft.md -o packs/my-pack \
  --seed my-track-id=123456 --seed other-track-id=654321
# finalize writes audio/*.opus + pack.json (with word stamps) into the pack
# dir; a per-track stamp report (coverage %, monotonicity) prints per run.
# Iterate story-by-story with --stories / --tracks — pack.json merges.

# publish the finished pack dir into the content repo (commit; push is opt-in)
env -u NODE_OPTIONS pnpm pipeline publish packs/my-pack --content ../sutinki-content --push
```

`annotate` prints `✓ <pack> v<n> → <file>` plus story/sentence/token counts on success. It may also print `warning: file:line: …` lines afterwards — those are non-fatal (today: a `UK:` line that mixes apostrophe code points, see the apostrophe rule). Errors are `file:line: message`, all of them at once; fix them all, re-run.

**Voices are named by id: `voice: elevenlabs:id:<voice_id>`** (UP03, ADR-0012) — the 20-character ElevenLabs voice id, validated `^[A-Za-z0-9]{20}$`, **no `/v1/voices` lookup** (it renders on the `ELEVENLABS_API_KEY_2` account regardless of that account's voice list). The legacy `elevenlabs:<name>` form still resolves a name through the account's voice list (alias before " - tagline"), and a bare 20-character id after `elevenlabs:` passes through. The default voice is **Mr. Wintrow**, `elevenlabs:id:HQ4Xi3gPf8Q6bJUlao6z` — a direction that names a `register:` and no `voice:` renders with it. The cast ids (ADR-0012) are in `docs/design/VOICE_CAST.md`. Credentials: **`ELEVENLABS_API_KEY_2`** (env or a gitignored `.env`); the plain `ELEVENLABS_API_KEY` is only a fallback that logs a warning.

### Narration audio — the default path (Eleven v4 · Mr. Wintrow · registers)

`pipeline audio` renders every story track with **`eleven_v4` · `elevenlabs:id:HQ4Xi3gPf8Q6bJUlao6z` · `mp3_44100_192`** unless a direction says otherwise (Sutinki UP03; overrides Sumrak's ADR-0016 Multilingual v2 default). v4 is a tagged model: inline `[audio tags]` steer delivery (rules: «Eleven v3 / v4 tags» below), and the request carries **no `previous_text`, no `language_code`, no speaker boost**. Every voice block that is rendered should pin `model: eleven_v4` explicitly. The register presets' `settings` and `stylePrompt` apply to **untagged models only** (e.g. a direction that pins `model: eleven_multilingual_v2`, which accepts `previous_text`, `language_code: uk`, continuous voice settings and speaker boost but has no tag channel); with v4 they are unused.

A **register** is a preset that fills a direction's defaults — `voice`, `style` (the register slug, which the app shows as a Ukrainian label), `settings` and `stylePrompt`. Name it in the `voice:` block and omit everything the preset already covers:

```yaml
voice:
  - id: nw001a1-wintrow-anchor
    register: anchor # narrator | anchor | lecturer | host | voiceover | guide
    deliveryNotes: >- # human-only, as before
      Evening-bulletin pace; each sentence is its own item.
```

| register    | `style` label in-app | default for `category`             | `stability / similarityBoost / style / speed / useSpeakerBoost` | `stylePrompt` (sent as `previous_text`)                                                                                             |
| ----------- | -------------------- | ---------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `narrator`  | Оповідач             | `stories`                          | `0.50 / 0.75 / 0.00 / 1.00 / true` (No End House §5.6, CT011e)  | «Я розповідаю цю історію повільно, тихо, ніби згадую те, чого не хотів би пам’ятати.»                                               |
| `anchor`    | Диктор               | `news`                             | `0.70 / 0.80 / 0.15 / 1.05 / true`                              | «Добрий вечір. В ефірі вечірній випуск новин. Коротко про головне.»                                                                 |
| `lecturer`  | Лектор               | `education`, `torfl`, `ukr-exam-*` | `0.65 / 0.80 / 0.20 / 0.97 / true`                              | «Отже, продовжимо лекцію. Сьогодні ми розберемо цю тему спокійно й по порядку. Зверніть увагу на приклади.»                         |
| `host`      | Ведучий              | `podcast`                          | `0.35 / 0.75 / 0.50 / 1.05 / true`                              | «Привіт-привіт! Ви слухаєте наш подкаст. Влаштовуйтеся зручніше — сьогодні буде цікаво, і я, чесно кажучи, сам не можу дочекатися.» |
| `voiceover` | Закадровий голос     | `documentary`                      | `0.60 / 0.80 / 0.25 / 0.95 / true`                              | «Тут, далеко від міст, природа живе за своїми законами. Щороку тут повторюється та сама історія.»                                   |
| `guide`     | Гід                  | `travel`                           | `0.40 / 0.75 / 0.45 / 1.02 / true`                              | «Дивіться, ми щойно приїхали, і я зараз усе вам покажу. Це місце — одне з моїх улюблених.»                                          |

Precedence (`packages/pipeline/src/registers.ts`, `applyRegister`):

1. An explicit `register:` applies its preset. **Anything authored in the block wins field by field** — `voice`, `style`, `stylePrompt` replace the preset's; `settings` **merge key-wise** (an authored `stability: 0.4` overrides only `stability`; the other four knobs still come from the preset). `model`, `language`, cues and everything else pass through untouched.
2. No `register:`, but the pack has a `category:` with a default register (table above) **and** the block omits `settings`, `stylePrompt` **and** `style` → the category's preset applies exactly as in 1. A block that carries any of those three is left **exactly as written** (every pre-M14 draft is such a block).
3. Otherwise the block is used as authored. Without a register, `voice` and `style` are **required**.

The resolved `voice`/`style` are what `pack.json`'s `AudioTrack` records and what the track id / audition file names use. `deliveryNotes` stay human-only. A family or anthology bible may pin tuned settings after audition, exactly as before — presets are starting points. Seeds, the audition → ear-check → finalize loop, and the per-request character-cap split rule are unchanged.

A track whose character alignment can't be trusted ships with zero word stamps (the app falls back to sentence-level karaoke) — the report says so; re-render with another seed rather than shipping bad stamps.

### Steering on v2: stylePrompt, contextCues, sentenceVoices, sentenceAudio

**`stylePrompt`** is fed to ElevenLabs as `previous_text` — write it in Ukrainian, in the piece's register, as if it were the narrator's preceding lines (a register preset supplies one; author your own to replace it). **`settings`** maps to provider voice settings (`stability`, `similarityBoost`, `style`, `speed`, `useSpeakerBoost` — boost defaults on for untagged (v2) renders). A direction may pin its own **`model:`** (wins over the CLI `--model`) and **`language:`** (sent as `language_code`; defaults to `uk` on untagged models; never sent to v3 / v4).

**Context cues (No End House re-voice, 2026-09-19):** v2 has no audio tags, so per-sentence mood is steered with **`contextCues: { <sentence-id>: '<context text>' }`** — a short Ukrainian stage direction («Я шепочу з жахом:», or a news anchor's «А тепер — до погоди.») rendered immediately BEFORE the sentence and then **cut out of the audio** using the provider's character timestamps, with every later word stamp shifted back by the cut (a `{}` in the text stands for the sentence, so `'Він благає: {} — схлипує він.'` renders an attribution after the line and cuts that too). Context characters bill like any other; the listener never hears them; nothing reaches `pack.json`; an unknown id is an error. Works on any model.

**Per-sentence voice override (CT011):** `sentenceVoices: { <sentence-id>: 'elevenlabs:<other voice>' }` renders those sentences in a second voice — a child's line inside a first-person narration, a podcast guest. The story is rendered as consecutive same-voice runs (each its own provider request), the override runs are level-matched to the narrator runs' mean level (never boosted into clipping), the runs are concatenated sample-accurately, and every run's word stamps are offset by the runs before it so karaoke stays exact across each seam. The pack still carries **one** track per part; nothing about the override reaches `pack.json`. Override runs get no narrator `audioTag` (v3) and no `stylePrompt`. Works on v3 and non-v3 models alike. An id not in the story is an error. Per-request character caps apply per run.

**Pre-rendered clips:** `sentenceAudio: { <sentence-id>: <path relative to the draft> }` splices a pre-rendered clip in as that sentence's audio with no provider request (a character line from a voice this account no longer has, cut out of an earlier track); a sibling `<clip>.stamps.json` (`WordStamp[]` relative to the clip start) carries its word stamps, otherwise the run ships unstamped while the rest of the track stays stamped. Clips are level-matched and spliced exactly like `sentenceVoices`.

### Eleven v3 / v4 tags (audioTag / audioCues)

**`eleven_v4` is the Sutinki narration default** (UP03, ADR-0012): every rendered voice block pins `model: eleven_v4` explicitly (UT12's kit enforces it) and carries plenty of v4 tags. `eleven_v3` stays opt-in per direction (`model:` wins over the CLI flag) or per run (`--model eleven_v3`); `--model eleven_multilingual_v2` selects the untagged path. The pipeline's gate is `isTaggedModel` (`eleven_v3*` and `eleven_v4`; **`eleven_v4_turbo` is refused** — it is the realtime model). On a tagged model, `previous_text` is not sent (v3 rejects it; v4 accepts it but the tag is the steering channel — `stylePrompt` is ignored there), `language_code` is not sent, and speaker boost is not defaulted on; steering is the tag channel: `audioTag: '[whispers]'` — one or more `[bracketed]` v3 tags — is prepended once to the whole track, and **per-sentence cues (CT011 Tier 2)** `audioCues: { <sentence-id>: '[tags]' }` insert tags right before that sentence (after its paragraph break) for mid-track mood shifts — e.g. `audioCues: { nea1p9-s105: '[calm] [ominous]' }`. Both are **tagged-model-only** (on untagged models they are silently not applied — the plain text renders; not an error), **render-time only** (tag characters shift the token spans so word stamps stay exact and are never stamped themselves), and **never reach `pack.json`**. A cue keyed to a sentence id that is not in the story is an error regardless of model. Tag characters count toward the provider's per-request character cap. Every family voiced before 2026-09-19 was rendered this way; those records in the CT tickets and `SERIES.md` §5 tables stand as history (ADR-0016).

#### Eleven v4 — what the account probe proved (T64, 2026-09-28)

Ten `with-timestamps` requests on `eleven_v4` with one of Mitch's designed voices («Lietenant Gromov»); MP3s, `metrics.json`, `pause-floors.json`, Whisper transcripts and the `verdict.json` live in `Stories/_build/_v4-probe/`. Every scenario host renders on v4 from CT025 on (Mitch's rule); narration stays on Multilingual v2 (ADR-0016).

| Question                                        | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (a) `eleven_v4` on the with-timestamps endpoint | **Accepted**; character alignment returned and it echoes the input text exactly (tag included) — word stamps work as on v3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| (b) `seed`                                      | **Take-deterministic, not sample-deterministic** (same as v3): two renders at one seed = identical duration, identical alignment, identical byte length, different bytes. Pinned seeds reproduce the take for the audition → finalize handshake.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| (c) `language_code`                             | **Accepted** (v3 rejects it). The pipeline does not send it on v4.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| (d) `previous_text`                             | **Accepted** (v3 rejects it). Not sent on v4 — the tag is the channel.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| (e) Short emotion tag (7 words)                 | **Applied**: alignment span 0.08 s, transcript = the Russian line only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| (f) Long tag (18 words)                         | **Do not.** v4 did not read the tag aloud — it rendered the line **twice** (the tag span swallowed a whole first rendition, 14 s instead of 5). Keep tags ≤ ~8 words; more detail = 2–3 short comma-separated ideas, never a sentence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| (g) In-tag sound effect (`[a door slams]`)      | **Rendered**, inside the tag's own alignment span (0–0.72 s, the loudest part of the file); speech starts after it; stamps stay exact because tag characters are never stamped. Put the effect tag **first**, then the emotion tag.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| (h) Filters / noises / spaces / distances       | **Not on the API — neither as tags nor as a request field.** `[old radio]` and `[tunnel, far]` were inert (no band-limiting, no reverb, same pause floors); `[small room, near]` made the model voice a stray «Так» inside the tag; `[café noise]` was inconclusive at best. The OpenAPI body for the endpoint has no effects field (`text, model_id, language_code, voice_settings, seed, previous_text, next_text, previous/next_request_ids, pronunciation_dictionary_locators, apply_text_normalization, apply_language_text_normalization, use_pvc_as_ivc`); the only effects fields in the whole spec are Agents-side (`conversation_config.background_sound`, `audio_effects.background_noise_id`), and the Agents docs call the voice filter dashboard-only. The UI's controls are post-processing on ElevenLabs' side. |
| (i) `voice_settings`                            | All five fields **accepted** (200); `style`, `speed` and `use_speaker_boost` are **inert** on v4 (the take was byte-length-identical to the baseline — speed 0.95 would have lengthened it). v4 exposes stability + similarity only; send those when a line needs them, never the other three.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

**v4 tag rules (from the probe + Mitch's UI notes):** ≤ ~8 words per tag · comma-separated ideas, not sentences · vocal sounds (`[sighs]`, `[laughs]`, `[clears throat]`) and in-tag sound effects work — effect tag first, emotion tag second · never write production-control words (room / distance / filter / noise) into a tag · Whisper-scan every audition and every final (`leak-scan.py`) exactly as on v3.

**v4 production controls — the cheat-sheet (vocabulary + when).** The vocabulary Mitch saw in the UI: **filters** Old Radio · Robot · Cheap Microphone · Phone · Low Quality Phone · Bright Phone; **noises** (ambience) Call Center · Café · City · Keyboard; **spaces** (room) Small Room · Big Room · Hall · Tunnel · Street · Valley · Forest; **distances** Near · Medium · Far. Guidance for a production design: a space + a distance only when the scene has a room (a duty room, a shop counter); a noise only when the script's scene has that ambience; a filter only for a phone / radio / robot line; never stack more than one filter. **Because the API renders none of them, a design is authored as a per-line `production` note in the driver's `tags.json` (`{ "tag": "[…]", "production": "small room, near" }`, or an `_production` map) and written to `<host>-v4/production.sidecar.json` — it is never sent to ElevenLabs. Applying it is a local post-processing step (ffmpeg: band-pass for phone / old radio, `aecho` / convolution for a space, an ambience bed mixed under the line) — a decision for Mitch, recorded as OPEN in T64; until then the sidecar documents the intent and the tags + in-tag effects carry the scene.**

**Inline notation in source docs:** a story doc may carry its cue script
inline — an italic _Leading tag_ line per part (→ `audioTag`), `{Ім'я}` at the
start of a dialogue paragraph (→ `sentenceVoices` on the one block that
paragraph becomes), and `[tag]` immediately before a sentence (→ `audioCues` on
that sentence's id). None of it is story content: drafts are authored from the
STRIPPED body, and a converter (`UkrainianStories/_build/<pack>/cues-from-doc.py`,
modes `--strip` / `--rekey` / `--apply`, ported from Sumrak's when a family
first needs it) writes the `voice:` blocks by exact sentence-text match, failing
loudly on any mismatch. When a dash paragraph mixes speech and attribution
(«— Так? — Голос у нього низький. — Хто це?»), author one `## id` block per
VOICE SEGMENT (split at every sentence-initial «— » that opens a new sentence
with a capital letter) so a `{Ім'я}` marker always maps to exactly one
`sentenceVoices` id.

`pipeline publish` refuses same-version content changes: bump `pack.version`
in every draft of the pack instead.

`pnpm pipeline` runs at the repo root, so relative paths resolve from there (`../UkrainianStories/…` for the source drafts). Exit codes: `0` success, `1` validation errors (all of them listed, `file:line: message`), `2` usage.

## Timestamps (word stamps — T80)

`audio[].timestamps` drive the karaoke highlight **and cut the listening-quiz
audio**, so they must match the audio, not the text. ElevenLabs character times
describe the _text it was sent_: a paragraph pause, a sigh or tag sound the
model renders carries no character time (every later stamp is then **early** — a
_step_ of +1.2 to +2.6 s measured on `rw5`, `sr1`, `sh2`), and `Mr. Wintrow` /
v4 takes run slowly _late_ (−27 ms/min median, the _drift_). The audio chain
itself (decode → excise → level-match → concat → MP3 → Opus) is sample-exact
(`test/timeline.test.ts`); the provider times are the defect. So since T80 the
stamps are **re-derived from the encoded Opus**:

1. a CTC forced aligner (`tools/forced_align.py`: Russian wav2vec2
   `jonatasgrosman/wav2vec2-large-xlsr-53-russian` + `torchaudio.functional.forced_align`)
   places every known word token in the audio;
2. boundary refinement on 5 ms RMS frames: each start snaps to the quiet point
   before the energy rise (±80 ms, never past the midpoint to a neighbour);
   each end is extended to the true energy release of the last phoneme (the
   aligner's end is early — this is the «ужасная» → «ужасно» end-clip fix);
3. invariants as before: one stamp per non-punct token, strictly monotonic,
   inside the duration, integer ms (the 20 ms provider quantisation is gone).

**Commands** (offline; no network once the model is cached, no API key):

```sh
pnpm pipeline stamp-audit <pack-dir|pack.json>… [--track id] [--json out.json]
pnpm pipeline restamp <pack-dir|pack.json> [--track id] [-o out.json]
pnpm pipeline audio drafts… -o <pack-dir> --seed …      # re-stamps by default
pnpm pipeline audio drafts… -o <pack-dir> --no-restamp  # keep provider stamps
pnpm pipeline publish <pack-dir> --content ../sutinki-content [--allow-stamp-risk]
```

- `stamp-audit` reports per track: median / p95 |offset| (published start vs the
  refined audio start), **step** (rolling-median jump), **drift** (ms/min),
  **end-clip rate**, the token-index check (stamped indices ≡ non-punct tokens)
  and the lemma lint (an adverb in -о carrying its adjective's lemma, e.g.
  «ужасно» → «ужасный»; a warning, not a gate, since predicatives such as
  «готово» legitimately share the pattern). It exits 1 over the thresholds:
  **median > 40 ms, p95 > 120 ms, any step > 250 ms, drift > 20 ms/min, any
  structural issue**.
- `restamp` changes **only** `audio[].timestamps` (asserted: the rest of the pack
  must serialise byte-identically) and never touches audio bytes. Run it on a
  `_build/<pack-id>` dir, re-run `stamp-audit`, bump `pack.version`, publish.
- `publish` runs `stamp-audit` first and **refuses** a failing pack.
  `--allow-stamp-risk` publishes anyway and appends the audit table to
  `<pack-dir>/BUILD_NOTES.md`; `--skip-stamp-audit` is only for packs with no
  word-sliced audio.
- `audio` (finalize) re-stamps each story track from its Opus right after
  encoding, so freshly rendered packs pass the gate; the old provider mapping
  now also warns when the stamped tail ends > 1 s before the audio does.

**Runtime.** Python 3.12 venv with `torch torchaudio transformers numpy`
(`/opt/homebrew/bin/python3.12 -m venv ~/.venvs/sutinki-align && ~/.venvs/sutinki-align/bin/pip install torch torchaudio transformers numpy`).
Point the pipeline at it with `SUTINKI_ALIGN_PYTHON=~/.venvs/sutinki-align/bin/python`
(optional `SUTINKI_ALIGN_DEVICE=mps` — about 10× faster on Apple silicon; cache
dir `SUTINKI_ALIGN_CACHE`, default `~/.cache/sutinki-align`, keyed by
sha256(audio + words)). The first run downloads the 1.2 GB model into the
Hugging Face cache (`HF_HOME`; set `HF_HUB_OFFLINE=1` afterwards). A full sweep
of all 493 published tracks (11.1 h of audio) took ≈ 75 min on MPS; one
track ≈ 5-15 s. `pipeline audio` checks the venv **before** any paid render and
stops if it is missing.

**Do not trust the provider's `previous_text`/character times for slicing.**
If a track still fails the audit after `restamp`, the audio itself is the
problem (a looped or garbled passage): re-render with another seed.

## Pack extras (course-unit / checkpoint / prompts packs)

Non-story sections live in ONE extras markdown file per pack, passed with `--extras` to `annotate` and `audio`:

```markdown
---
pack: # OPTIONAL next to drafts (must equal their pack meta);
  id: a1-checkpoint-001 # REQUIRED when the pack has no story drafts
  version: 1 #   (checkpoint / prompts packs)
  type: checkpoint
  title: { uk: 'Контрольна A1 → A2', en: 'A1 → A2 Checkpoint' }
  level: A1
  tags: ['checkpoint']
lesson: # lesson META — its `body` is the markdown BELOW the fence
  id: unit-lesson
  title: { uk: 'Урок', en: 'Lesson' }
  grammarTopics: [locative-location]
prompts:
  - id: prompt-1
    level: A1
    prompt: { uk: 'Опишіть свою кімнату.', en: 'Describe your room.' }
exercises: # authored ExerciseSpec[] (see packages/schema — 5 kinds:
  - id: ex-1 #   multiple-choice, cloze, sentence-builder, listening,
    kind: multiple-choice #   pronunciation)
    direction: uk-en # uk-en | en-uk
    prompt: 'двері'
    choices: ['door', 'window']
    correctIndex: 0
  - id: ex-2
    kind: cloze
    sentenceUk: 'У кімнаті стоїть ___.' # the blank is "___"
    answer: 'дзеркало'
    choices: ['дзеркало', 'вікно', 'стіл']
---

## The lesson markdown body goes here (only when `lesson:` meta is present)
```

- A `course-unit` pack = story drafts **plus** `--extras` (schema requires the lesson). A `checkpoint`/`prompts` pack can be extras-only: `env -u NODE_OPTIONS pnpm pipeline annotate --extras cp.extras.md -o pack.json`.
- The body below the fence **is** `lesson.body`; declaring `lesson:` with an empty body (or a body with no `lesson:`) is an error.
- Everything is NFC-normalized, the apostrophe is kept exactly as authored, and the merged pack is validated against the shared schema like any other.
- Unit quizzes are GENERATED by the app from the unit's stories — author `exercises:` only for checkpoints.

### Theme & track (course units)

Two more optional extras-frontmatter keys flow verbatim into the pack JSON:

```yaml
theme: # ambient room theme — drives the house map
  scene: hallway #   and the ambient room scenes
  accent: '#C08A4A' # optional '#RRGGBB' scene accent
track: family # path track; OMIT for the main track
```

- **Known scenes** (the app's house set, top floor → cellar): `hallway`, `living-room`, `kitchen`, `pantry`, `nursery`, `cellar`. Units carrying one of these render as rooms of the house cross-section on the Шлях tab. Any _other_ string is valid and forward-compatible — the unit simply renders with the default path presentation until an app update knows the scene.
- **Track naming**: kebab-case ids like story/pack ids. Omitted = the main track (`main` is applied app-side — never author `track: main`). The family arc uses `track: family`, which the app titles «Родина»; new tracks render with their raw id until the app learns a display name.
- Both keys are course-unit concerns today; the schema allows them on any pack type so future content shapes need no schema bump.

## Draft file grammar

A draft has two parts: **YAML frontmatter** between `---` fences, then **sentence blocks**.

### Frontmatter

```yaml
---
pack:
  id: a1-peeking-wife-001 # stable kebab-case id, never renumbered
  version: 1 # integer ≥ 1; bump to update a published pack
  type: stories # stories | course-unit | checkpoint | prompts | dialogue | scenario | exam
  title:
    {
      uk: 'Моя дружина дивиться на мене з-за рогу',
      en: 'My Wife Keeps Peeking at Me from Around Corners',
    }
  level: A1 # A1 | A2 | B1 | B2 | C1  (no C2)
  tags: ['creepypasta', 'horror', 'grammar:genitive']
  category: stories # OPTIONAL (M14): stories | news | education | podcast | documentary | travel | torfl (M18) | ukr-exam-a1…c1 (UT16)
  genre: horror # OPTIONAL (M14): fiction genre — horror | mystery | scifi | fantasy | action |
  #   comedy | romance | drama | family | slice-of-life | absurd | fairy-tale
story:
  id: part-1 # unique within the pack
  title: { uk: 'Частина 1. Перший раз', en: 'Part 1. The First Time' }
  subtitle: { uk: 'Епізод 1', en: 'Episode 1' } # OPTIONAL (M14): dek / tagline / lesson subtitle
  source: # OPTIONAL (M14): provenance — `name` at minimum
    name: 'Сутінки' #   publication / channel / author-as-publisher
    url: 'https://example.invalid/x' #   original URL when one exists
    publishedAt: '2026-09-14' #   ISO calendar date YYYY-MM-DD (news sorts newest-first on it)
    author: 'Містер Вінтроу' #   byline
  level: A1 # may differ from the pack level
voice: # OPTIONAL — voice direction for narration (used by `pipeline audio`, T09)
  - id: part1-wintrow-narrator # audio track id this rendition will get
    register: narrator # M14 preset: fills voice (Mr. Wintrow), style, settings, stylePrompt
    stylePrompt: >- # OPTIONAL — replaces the preset's; sent as previous_text
      Повільно, тихо, з тривогою — як людина, що розповідає про те,
      у що не хоче вірити.
    deliveryNotes: >- # free-form notes: pacing, pauses, emphasis
      Slow slightly on the final sentence of the part.
---
```

Rules:

- `pack:` and `story:` are required; `voice:` is optional (add it when you already know how the story should be narrated — `annotate` validates its shape and otherwise ignores it). A `voice:` block names either a `register:` or both `voice:` and `style:` (the pre-M14 form — see the narration section above).
- Every bilingual field is `{ uk: '…', en: '…' }`. A `ru:` key anywhere in the frontmatter is a schema error (`Unrecognized key`).
- All ids are lowercase kebab-case (`[a-z0-9-]`), stable forever — never renumber or reuse.
- In a multi-story pack, every draft's `pack:` section must be **byte-identical** in meaning (same id, version, type, title, level, tags, category, genre) or the pipeline refuses.
- **`category` / `genre` (M14, `docs/design/LIBRARY_CATEGORIES.md` §2)** are plain kebab-case slugs the **app** classifies — unknown values are valid and render with their raw slug until the app learns them; `genre` only means something on the `stories` shelf and is never tied to `category` by the schema. `category` is per pack (every story in a pack sits on the same shelf). **Every new CT names `category` (+ `genre` for fiction) and `register`.** App-side defaults when absent: `stories` / `course-unit` packs → `stories` + `horror`; `dialogue` packs → `stories` with no genre; imported pastes always sit on their own «Імпортовано» shelf.
- **`subtitle` / `source` (M14)** are per story: `subtitle` is the dek / episode tagline / lesson subtitle; `source` is provenance — `name` always (Mitch's own pieces: `name: 'Mitchell Wintrow'` or «Сумрак»), `publishedAt` for anything dated (it drives the news shelf's newest-first order), `url`/`author` when they exist. Fiction rungs normally carry neither.

### Sentence blocks

After the frontmatter, the body is a sequence of sentence blocks:

```markdown
## pwa1p1-s01

UK: У мене є стара фотографія.
EN: I have an old photograph.
GRAMMAR: possession-u-genitive

| text       | lemma      | translation     | pos  | grammar                         | level | note |
| ---------- | ---------- | --------------- | ---- | ------------------------------- | ----- | ---- |
| У          | у          | at (possession) | prep | + gen.; у мене є = I have       | A1    |      |
| мене       | я          | me              | pron | gen.                            | A1    |      |
| є          | є          | there is        | pred | existential (у мене є = I have) | A1    |      |
| стара      | старий     | old             | adj  | f.sg. nom.                      | A1    |      |
| фотографія | фотографія | photograph      | noun | f.sg. nom.                      | A1    |      |
| .          |            |                 |      |                                 |       |      |
```

Line by line:

- `## <sentence-id>` — starts a sentence. The id is **unique across the whole pack** (not just this story), because the app's user data references sentence ids pack-wide. Convention: a short story slug + part + counter, e.g. `pwa1p1-s01`, `pwa1p1-s02`, …
- `UK:` — the full Ukrainian sentence, exactly as it should appear in the app. Single spaces only. (`RU:` is rejected with an error that names `UK:` — the key is `uk` everywhere.)
- `EN:` — the natural English translation (shown by the reader's "reveal" toggle). Translate the meaning, not word-by-word.
- `GRAMMAR:` — optional, comma-separated grammar topics this sentence exercises (`past-tense, genitive-negation`). Use the kebab-case tags from the [grammar-tag canon](#grammar-tags-ukrainian-canon) below, consistently across stories; they feed the app's grammar-coverage tracking.
- The **token table** — one row per token, in sentence order. Header must be exactly `text | lemma | translation | pos | grammar | level | note`.

Also allowed in the body: blank lines, single-line HTML comments (`<!-- … -->`), and decorative `# Heading` lines (ignored). Anything else is an error — the parser never skips content silently.

### Token table columns

| Column        | Word tokens                                                                                                                                                                                                                                                                                                                                                                                                                                               | Punctuation tokens          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `text`        | **Required.** The surface form exactly as it appears in the sentence, capitalization and apostrophe included.                                                                                                                                                                                                                                                                                                                                             | The punctuation mark itself |
| `lemma`       | **Required.** Dictionary form: nominative singular for nouns/adjectives, imperfective infinitive in **-ти** for verbs (see the lemma conventions below).                                                                                                                                                                                                                                                                                                  | Must be empty               |
| `translation` | **Required.** Context-appropriate English gloss of _this occurrence_ («стоїть» in «Будинок стоїть за містом» is "stands", never "costs").                                                                                                                                                                                                                                                                                                                 | Must be empty               |
| `pos`         | Recommended. `noun`, `verb`, `adj`, `adv`, `pron`, `prep`, `conj`, `part`, `pred`, `num`, `name`, `interj`. `pred` covers impersonal predicatives — «страшно», «холодно», «треба», «можна», «шкода» in dative-experiencer sentences («мені страшно»), and existential «є» / «немає». «мушу» / «мусити» (_must_) is a `verb`. A short-form adjective with an explicit subject stays `adj` with "short form" noted in `grammar` («я радий», «він готовий»). | Must be empty               |
| `grammar`     | Recommended. Compact notes: `f.sg. nom.`, `1sg. pres. (impf.)`, `+ gen.`, `pf. of казати`, `m.sg. voc.`.                                                                                                                                                                                                                                                                                                                                                  | Must be empty               |
| `level`       | Recommended. CEFR level **of the lemma** (`A1`–`C1`), not of the surface form or the sentence.                                                                                                                                                                                                                                                                                                                                                            | Must be empty               |
| `note`        | Optional. Idiom/culture note shown in the word popup.                                                                                                                                                                                                                                                                                                                                                                                                     | Optional                    |

- **A token is punctuation automatically** when its `text` contains no letters or digits (`.`, `,`, `:`, `«`, `»`, `—`, `…`, `!`, `?`). You never mark it; you only leave its annotation cells empty. Hyphenated words («хто-небудь», «з-за», «будь-який», «по-перше») contain letters, so they are word tokens (keep them as **one** token). An apostrophe inside a word («п'ять», «ім'я») is part of the word — never its own token.
- Missing `lemma` or `translation` on a word token is a **hard error with a line number** — by design the pipeline never auto-fills. `pos`/`grammar`/`level` may be omitted where they genuinely add nothing (e.g. particles), but fill them in as a rule; the app's progress model runs on `level`.
- An empty cell means "absent". To put a literal `|` inside a cell, write `\|`.

### The seven cases in the `grammar` column

Ukrainian has seven cases; abbreviate them consistently — the column renders in the tap-word popup:

| Case             | Abbrev.  | Example row                                                                                                       |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| називний (nom.)  | `nom.`   | «кіт» → `m.sg. nom.`                                                                                              |
| родовий (gen.)   | `gen.`   | «кота» in «немає кота» → `m.sg. gen. (after немає)`                                                               |
| давальний (dat.) | `dat.`   | «мені» → `dat. (experiencer)`                                                                                     |
| знахідний (acc.) | `acc.`   | «кота» in «бачу кота» → `m.sg. acc. (animate = gen.)`                                                             |
| орудний (instr.) | `instr.` | «з дружиною» → `f.sg. instr. (after з)`                                                                           |
| місцевий (loc.)  | `loc.`   | «у квартирі» → `f.sg. loc. (after у)`                                                                             |
| кличний (voc.)   | `voc.`   | «Мамо!» → `f.sg. voc. (address)`; «Девіде», «Дідусю»; an indeclinable name in address → `voc. (address; indecl.)` |

The **vocative** is real and frequent in dialogue («Лінн!», «Крісе!», «синку»); annotate it as `voc.` with the nominative as lemma and tag the sentence `vocative-case`. The locative is what Russian calls prepositional; both the **grammar cell** (`loc.`) and the coverage **tag** (`locative-location`) use the Ukrainian name.

### The alignment rule (most important)

The `text` column, read top to bottom, must **reconstruct the UK: sentence exactly** — every character, in order, including punctuation and apostrophes. The pipeline walks the sentence as it reads your rows and fails (with the offending row's line number and a `⟨here⟩` marker showing where matching broke) if a token is missing, misspelled, misordered, or duplicated.

Spacing is **derived, not authored**: the pipeline sees where spaces sit in `UK:` and records the non-default cases (like «…» quotes hugging their content) automatically. You never write spacing flags — just make sure the `text` cells match the sentence.

Practical workflow: write the `UK:` sentence first, then split it into tokens mechanically — words and punctuation marks, left to right, nothing skipped, nothing merged (except hyphenated and apostrophe words, which stay whole).

### The apostrophe rule

Ukrainian's apostrophe («п'ять», «ім'я», «м'ясо», «сім'я», «комп'ютер», «з'явитися», «в'язати») is a letter-like part of the word. Three code points exist in the wild — `'` U+0027, `’` U+2019, `ʼ` U+02BC — and the app's matcher folds them all (ADR-0004), but **stored content is never rewritten**: whatever you type is what ships.

- **Write U+0027 `'`** (the plain ASCII apostrophe). The source stories use it throughout; it is the convention.
- **One apostrophe per sentence.** A `UK:` line mixing code points («п'ять і дев’ять») is a **warning** (`mixes apostrophe code points (U+0027 ', U+2019 ’)`) — the pack still builds, but fix it: the word bank and search hinge on the fold, and a mixed sentence usually means a copy-paste from a different source.
- **Token text must match the sentence's apostrophe exactly.** A row whose `text` uses `’` where `UK:` has `'` is an **error** (`apostrophe mismatch: token "П’ять" uses U+2019 ’ but sentence "…" has U+0027 '`) — the alignment rule would have failed anyway; the message just names the real cause.
- Lemmas keep the apostrophe too («п'ять» → «п'ять»), with the same code point as the surface form.
- Never "fix" an apostrophe into a hard sign, a quote mark, or nothing: «пять» is a different (wrong) word.

## Lemma conventions

These are the conventions the existing Ukrainian drafts follow; copy their cells when in doubt.

1. **Verbs → imperfective infinitive in -ти**, aspect in `grammar`. Cell formats used: `1sg. pres. (impf.)`, `3pl. pres. (impf.)`, `2sg. imper. (impf.)`, `infinitive (impf.)`; past = `1sg.m. past (impf.)` / `3sg.f. past (impf.)`. A **perfective** form takes the **perfective infinitive** as lemma and `pf. of <impf.>` in grammar: «закінчилася» → lemma «закінчитися», grammar `3sg.f. past; pf. of закінчуватися`; «минув» → «минути», `m.sg. past (pf. of минати)`. **Reflexive -ся stays in the lemma** and is named in the cell: «дивиться» → «дивитися», `3sg. pres. (impf., reflexive)`; «боюся» → «боятися»; «усміхається» → «усміхатися». Colloquial «-сь» surfaces («дивлюсь») still lemmatize to the «-ся» infinitive. «йду / йде / йдуть / іди» → lemma **«іти»** (not «йти»).
2. **«Мене звати Бен.»** — the naming construction uses the infinitive: «звати» is a `verb`, grammar `infinitive (impf.); impersonal naming construction`; «Мене» is `pron`, lemma «я», `acc.`; note «also common: Мене звуть Бен».
3. **Nouns → nominative singular**; plurale tantum stays plural («двері», «окуляри», «гроші») with `pl. nom.; pluralia tantum` in grammar. **Adjectives → masculine nominative singular** («стара» → «старий», «моїй» → «мій»). A substantivized adjective («у ванній») is a noun-like cell: `f.sg. loc. (substantivized adj)`.
4. **Personal pronoun forms → their nominative**: «мене», «мені», «мною» → «я»; «неї», «її» (_her_, object; «її немає») → «вона» with `gen. (object of немає)`; «нього» → «він»; «нас» → «ми». «це» is `pron`, lemma «це», `n.sg. nom.` (add `(demonstrative)` when it opens a «Це …» sentence); «що» → `acc.` / `nom.` as used; «хтось» / «ніщо» stay themselves (`indefinite-pronouns`).
5. **Possessives**: indeclinable «його / її / їх» (_his / her / their_) → itself, `pron`, grammar `possessive, indeclinable`; declining «мій / твій / наш / ваш / свій» → masculine nominative singular («моєї» → «мій», `f.sg. gen.`), `pron`, adjective-style grammar.
6. **Pronoun-adjectives** («цей», «той», «кожен», «весь», «такий», «який», «сам») → masculine nominative singular, `pron`, adjective-style grammar (`m.sg. acc. (time expression)`, `m.sg. nom. (used predicatively = alone)`).
7. **Numerals** («два», «три», «п'ять», «сорок», ordinals «другий») → `num`, lemma = nominative. **Ukrainian 2–4 take the NOMINATIVE plural** (unlike Russian's genitive singular): «два місяці» → the «місяці» row says `m.pl. nom. (after два/три/чотири)`; «три дні» → `m.pl. nom. (after три)`; tag `numbers-nominative-plural`. **5+ take the genitive plural**: «шість років» → `m.pl. gen. (after 5+)`, «сорок хвилин» → `f.pl. gen. (after сорок)`; tag `numbers-genitive`. «один» agrees like an adjective («одну годину» → `f.sg. acc. (duration expression)`). Put the case government on the **noun's** row; the numeral's own cell is just `nom.` / `m. nom.`.
8. **Adverbs stay adverbs**, even when historically a frozen noun form: «вдома» → «вдома» (not «дім»), «увечері» → «увечері», «вночі», «додому»; «повільно» → «повільно» (never the adjective «повільний»).
9. **Prepositions**: hyphenated «з-за» is one `prep` token, lemma «з-за», `+ gen. (spatial)`; «у / в», «на» take `+ loc. (location)` or `+ acc. (direction)` — write which; «з / зі / із» + instr. → `+ instr.`.
10. **Conjunctions and particles**: «і / й / та» → `conj`; «як» as comparison → `conj`, grammar `comparison`; «що / коли / де / бо» opening a clause → `conj`; «не» → `part`, grammar `negation`; «тільки», «ж», «же», «ні» → `part`. `level` A1.
11. **Predicatives → `pred`**: «немає» (`+ gen. = there is no …`), «є» (existential), «страшно / холодно / темно / дивно / погано» (`impersonal predicative`, add `+ dat. (мені страшно = I'm scared)` when the experiencer is present), «треба» (`impersonal predicate + dat. + infinitive`), «можна / не можна». «мушу / мусиш / мусить» → lemma «мусити», `verb`, tag `modal-musyty`.
12. **Names → `name`, lemma = nominative with its capital, no `level`.** Declining names get real cases («Крісом» → «Кріс», `m.sg. instr. (ми з + instr. = Chris and I)`; «Крісе» → `voc.`). Indeclinable names («Лінн», «Бен», «Мар») say so: `nom.; indecl.`, and in address `voc. (address; indecl.)`. Either way the sentence gets the `vocative-case` tag when the name is an address.
13. **Interjections and onomatopoeia → `interj`, no `level`**: «БАМ» → lemma «бам» (lowercase), note what it is; «Боже» → lemma «Бог», `vocative of Бог; exclamation "my God"`; a standalone «Добре.» reaction → `interj`, `standalone reaction, not modifying a verb`.

## Gotchas

1. **The apostrophe is sacred** — see [the apostrophe rule](#the-apostrophe-rule). Write U+0027, never rewrite it, one code point per sentence, token text identical to the sentence. (Russian's «dot-over-е» letter rule has no Ukrainian analogue.)
2. **і / ї / и / є / ґ are distinct letters.** «і» (U+0456) is not Latin «i» (U+0069) — a Latin letter inside a Ukrainian word is a silent tokenization landmine (the app's matcher will never find it). Type on a Ukrainian layout; «ґ» («ґанок», «ґудзик») is written where the orthography has it — the app folds ґ→г only when _matching_.
3. **Punctuation is its own row.** «Стук у стіні.» is four tokens: `Стук`, `у`, `стіні`, `.` — forgetting the final period row is the most common alignment error.
4. **Capitalization in `text`, lowercase in `lemma`.** Surface «У» keeps its capital; its lemma is «у». (Proper names keep their capital in the lemma too.)
5. **Glosses are contextual.** `translation` is what the word means _here_, so «стоїть» in «У вікні стоїть людина» is "stands", not "costs". Add the general sense to `note` if it helps.
6. **Sentence ids are pack-wide unique and permanent.** Prefix them with a story slug (`pwa1p1-s01`, `cat-s01`) so two stories in one pack can never collide.
7. **Single spaces only** in `UK:` — a double space is an alignment error. Use « » for quotes (not " "), — for dashes, … for ellipsis; they're all just punctuation tokens. Direct speech opens with «— » (em dash, space) at the start of the line. A line that ends in a colon before quoted speech («Я кажу:») is its own one-block sentence.
8. **The em-dash copula is a punctuation token.** «Моя дружина — Лінн.», «Пітер — наркоман.», «Там — її обличчя.» are `zero-copula` sentences: the `—` row is punctuation, the subject and predicate are ordinary rows. Ukrainian A1 leans on this shape constantly — do not \"repair\" it with «є».
9. **Fragments are sentences.** «Ніч.», «Я сам.», «З-за штор.», «Або ні?» each get their own `## id` block with a full table (a one-token sentence is two rows: the word and its period). Do not merge fragments into a neighbour to make a \"real\" sentence.
10. **The grammar column is reader-facing.** Keep the compact-abbreviation style (`f.sg. nom.`, `m.pl. gen.`, `3sg. pres.`, `voc.`) consistent with existing packs — it renders in the tap-word popup.
11. **«у» / «в» and «і» / «й» alternate for euphony** — author the form that sounds right after the preceding sound («у вікні», «в Одесі»; «Бен і Лінн», «вона й він»); the lemma is «у» / «в» and «і» / «й» as written, never normalized to one.
12. **Vocative is not a typo.** «Мамо», «Бене», «синку» are correct addresses — annotate `voc.`, do not "correct" them to the nominative.

## Grammar tags (Ukrainian canon)

`GRAMMAR:` topics and `grammar:<tag>` pack tags are the dashboard's coverage keys — spell them exactly as listed; a new spelling is a new (empty) coverage bucket. The canon is the set the existing Ukrainian drafts use, named after **Ukrainian** grammar (the case is the locative, the preposition is «з», the copula is «є»), plus the Sumrak tags that carry over because they have no Russian keyword in them.

**Sentence shape:** `present-tense` · `past-tense` · `future-tense` · `zero-copula` (incl. the em-dash copula «X — Y.») · `direct-speech` · `question-intonation` · `imperative` · `imperative-negative` · `infinitive-complement` («хочу йти», «треба поговорити»).

**Cases:** `locative-location` («у будинку», «на стіні» — the locative case; Sumrak's `prepositional-location` is **not** used) · `accusative-direct-object` · `accusative-direction` («на мене», «у кімнату») · `genitive-negation` («її немає») · `genitive-direction` («до будинку») · `possession-u-genitive` («у мене є») · `dative-experiencer` («мені страшно») · `dative-indirect-object` · `instrumental-with-z` («зі мною», «з Крісом»; Sumrak's `instrumental-with-s` is **not** used) · `instrumental-tool` · `instrumental-location` («за містом») · `vocative-case` («Лінн!», «Мамо», «Крісе»).

**Words and forms:** `existential-ye` («є»; Sumrak's `existential-est` is **not** used) · `adjective-agreement` · `reflexive-verbs` · `verbs-of-motion-unidirectional` · `verbs-of-motion-multidirectional` · `verbs-of-motion-prefixed` · `indefinite-pronouns` («хтось», «щось») · `numbers-nominative-plural` (2–4 + nom. pl.) · `numbers-genitive` (5+ + gen. pl.) · `ordinal-numbers` · `time-expressions` · `comparison-yak` («як тварина») · `purpose-shchob` · `relative-yakyi` · `modal-musyty` · `short-adjectives` (rare — «радий / готовий / повинен»).

Non-canon spellings seen in the older drafts and **not** to be reused: `vocative` (→ `vocative-case`), `genitive-locative-location` (pick the case that is actually there). A tag you need that is not listed above is a stop-and-ask: the coordinator adds it to the family bible **and** to this list in the same session, never silently.

A very-early-A1 part usually needs only a handful: `present-tense`, `zero-copula`, `possession-u-genitive`, `genitive-negation`, `dative-experiencer`, `direct-speech`, `question-intonation`, `locative-location`, `accusative-direct-object`, `vocative-case`.

## Complete worked example

A valid three-sentence draft, start to finish — a possession sentence, direct speech with genitive negation, and a dash-opened vocative question:

```markdown
---
pack:
  id: a1-example-001
  version: 1
  type: stories
  title: { uk: 'Кіт', en: 'The Cat' }
  level: A1
  tags: ['creepypasta', 'horror', 'grammar:possession-u-genitive', 'grammar:genitive-negation']
story:
  id: the-cat
  title: { uk: 'Кіт', en: 'The Cat' }
  level: A1
voice:
  - id: door-wintrow-narrator
    register: narrator
    deliveryNotes: >-
      Quiet, confessional dread. The narrator is trying to stay calm.
---

# Кіт — The Cat

## cat-s01

UK: У мене є кіт.
EN: I have a cat.
GRAMMAR: possession-u-genitive, existential-ye, present-tense

| text | lemma | translation     | pos  | grammar                   | level | note |
| ---- | ----- | --------------- | ---- | ------------------------- | ----- | ---- |
| У    | у     | at (possession) | prep | + gen.; у мене є = I have | A1    |      |
| мене | я     | me              | pron | gen.                      | A1    |      |
| є    | є     | there is        | pred | existential               | A1    |      |
| кіт  | кіт   | a cat           | noun | m.sg. nom.                | A1    |      |
| .    |       |                 |      |                           |       |      |

## cat-s02

UK: Мама каже: «Його немає».
EN: Mom says: "There is no cat."
GRAMMAR: genitive-negation, direct-speech

| text  | lemma  | translation | pos  | grammar                | level | note                               |
| ----- | ------ | ----------- | ---- | ---------------------- | ----- | ---------------------------------- |
| Мама  | мама   | mom         | noun | f.sg. nom.             | A1    |                                    |
| каже  | казати | says        | verb | 3sg. pres. (impf.)     | A1    |                                    |
| :     |        |             |      |                        |       |                                    |
| «     |        |             |      |                        |       |                                    |
| Його  | він    | it          | pron | gen. (object of немає) | A1    |                                    |
| немає | немає  | is not      | pred | + gen. = there is no … | A1    | немає + genitive negates existence |
| »     |        |             |      |                        |       |                                    |
| .     |        |             |      |                        |       |                                    |

## cat-s03

UK: — Мамо, де кіт?
EN: "Mom, where is the cat?"
GRAMMAR: vocative-case, question-intonation, direct-speech, zero-copula

| text | lemma | translation | pos  | grammar              | level | note |
| ---- | ----- | ----------- | ---- | -------------------- | ----- | ---- |
| —    |       |             |      |                      |       |      |
| Мамо | мама  | Mom         | noun | f.sg. voc. (address) | A1    |      |
| ,    |       |             |      |                      |       |      |
| де   | де    | where       | adv  | interrogative        | A1    |      |
| кіт  | кіт   | the cat     | noun | m.sg. nom.           | A1    |      |
| ?    |       |             |      |                      |       |      |
```

Run it:

```bash
env -u NODE_OPTIONS pnpm pipeline annotate the-cat.draft.md -o pack.json
# ✓ a1-example-001 v1 → pack.json
#   1 story, 3 sentences, 19 tokens — schema-valid
```

The same example with an apostrophe word, to see the rule in action — «У мене є п'ять котів.» tokenizes as `У`, `мене`, `є`, `п'ять` (`num`, lemma «п'ять»), `котів` (`noun`, lemma «кіт», grammar `m.pl. gen. (after 5+)`), `.` — six rows, the apostrophe inside `п'ять` written as U+0027 in `UK:`, `text`, and `lemma` alike.

## Dialogue drafts (`*.dialogue.md`)

A **dialogue draft** is one markdown file containing **one branching dialogue**: NPCs speak to the learner, the learner answers out loud, and on-device ASR picks the branch (the speak-your-choice simulator). One dialogue = one draft file; a multi-dialogue pack is several files with identical `pack:` frontmatter. Story drafts and dialogue drafts can even share a pack — the pipeline tells them apart by the frontmatter (`dialogue:` section present), never by filename.

Everything you know from story drafts carries over unchanged: the sentence block (UK/EN/GRAMMAR + 7-column token table), the alignment rule, all the lemma conventions, the apostrophe rule and gotchas above, NFC. **Every line of a dialogue — NPC and player alike — is a fully annotated sentence**, tap-word explorable in the app like story text. Dialogue is where the vocative lives — use it.

### Frontmatter

```yaml
---
pack:
  id: a2-dialogue-001
  version: 1
  type: dialogue # the pack type for dialogue packs
  title: { uk: 'Вечеря у мами', en: "Dinner at Mama's" }
  level: A2
  tags: ['dialogue', 'family']
dialogue:
  id: dinner-mini # unique within the pack
  title: { uk: 'Вечеря у мами', en: "Dinner at Mama's" }
  level: A2 # may differ from the pack level, like story.level
  startNodeId: din-n01 # OPTIONAL — defaults to the first scene block
characters:
  - id: mama # who can speak; ids are referenced by SPEAKER:
    name: { uk: 'Мама', en: 'Mama' }
    voice: elevenlabs:Mariia # provider-prefixed, like story voice ids
    style: warm
  - id: player # RESERVED id: the learner. Its voice/style name the
    name: { uk: 'Ти', en: 'You' } # neutral "coach" voice used for optional
    voice: elevenlabs:VASKO # model audio of player lines
    style: neutral
endings:
  - id: end-good # referenced by nodes' ENDING: lines
    title: { uk: 'Чудове враження', en: 'A great impression' }
    recap: { uk: 'Ти поїв, і всі задоволені.', en: 'You ate, and everyone is pleased.' }
    tone: good # good | bad | strange
---
```

### Scene blocks

The body is a sequence of **scene blocks** — one per node of the graph. A linear node ends with `NEXT:`, a terminal node with `ENDING:` — each on its own line directly after the token table (blank lines around it are fine):

```markdown
## din-n01

SPEAKER: mama

UK: Заходь, синку!
EN: Come in, son!
GRAMMAR: imperative, vocative-case

| text   | lemma    | translation | pos  | grammar             | level | note |
| ------ | -------- | ----------- | ---- | ------------------- | ----- | ---- |
| Заходь | заходити | come in     | verb | 2sg. imper. (impf.) | A2    |      |
| ,      |          |             |      |                     |       |      |
| синку  | синок    | son (dear)  | noun | m.sg. voc.          | A2    |      |
| !      |          |             |      |                     |       |      |

NEXT: din-n02
```

A terminal node is identical but closes with `ENDING: <ending-id>` instead (e.g. `ENDING: end-good`). A choice point closes with `CHOICES:` and its choice blocks:

```markdown
## din-n02

SPEAKER: mama

UK: Ти голодний?
EN: Are you hungry?
GRAMMAR: question-intonation, zero-copula

| text     | lemma    | translation | pos  | grammar         | level | note |
| -------- | -------- | ----------- | ---- | --------------- | ----- | ---- |
| Ти       | ти       | you         | pron | nom. (informal) | A1    |      |
| голодний | голодний | hungry      | adj  | m.sg. nom.      | A2    |      |
| ?        |          |             |      |                 |       |      |

CHOICES:

### din-n02-c1 -> din-n03

UK: Так, я дуже голодний.
EN: Yes, I'm very hungry.

| text     | lemma    | translation | pos  | grammar    | level | note |
| -------- | -------- | ----------- | ---- | ---------- | ----- | ---- |
| Так      | так      | yes         | part |            | A1    |      |
| ,        |          |             |      |            |       |      |
| я        | я        | I           | pron | nom.       | A1    |      |
| дуже     | дуже     | very        | adv  |            | A1    |      |
| голодний | голодний | hungry      | adj  | m.sg. nom. | A2    |      |
| .        |          |             |      |            |       |      |

ALT: Так, дуже.
HINT: Скажи, що ти голодний. | Say that you're hungry.
```

Block by block:

- `## <node-id>` — starts a node. One node = **one spoken sentence**. Node ids are kebab-case, unique, and **double as the sentence id**, so they share the pack-wide sentence-id namespace with story sentences and choice ids — prefix them with a dialogue slug (`din-n01`, `din-n02`, …).
- `SPEAKER: <characterId>` — who says this line; must be a `characters:` id. `SPEAKER: player` is allowed for a scripted (non-branching) player line.
- Then the standard sentence block: `UK:` / `EN:` / optional `GRAMMAR:` + the token table, exactly as in story drafts.
- Then **exactly one** of:
  - `NEXT: <node-id>` — linear continuation;
  - `ENDING: <ending-id>` — the dialogue finishes here with that ending;
  - `CHOICES:` — this is a **choice point**: the player answers this line out loud.

### Choices

Choices live **on the node being answered** (an NPC line, usually a question) — there are no separate player nodes; each choice IS the player's spoken line. After `CHOICES:`, write 2–4 choice blocks:

- `### <choice-id> -> <node-id>` — the choice id (convention: `<node-id>-c1`, `-c2`, …; it doubles as the choice's sentence id) and the node the story branches to.
- The player's line as a standard sentence block (UK/EN + token table — annotate it fully; choice cards are tap-word explorable too).
- `ALT: <alternate phrasing>` — optional, repeatable. Natural rephrasings the ASR matcher should also accept for this choice («Так, дуже.» for «Так, я дуже голодний.»). Write them as a speaker would actually say them; matching is case/punctuation/apostrophe/ґ-tolerant on the app side.
- `HINT: <uk nudge> | <en nudge>` — optional, one line, both halves required (escape a literal `|` as `\|`). Shown on long-press when the learner is stuck.

No `SPEAKER:` in choices — choices always speak as `player`. A node with `CHOICES:` must **not** have `SPEAKER: player` (the player can't await their own answer).

### Graph rules (the pipeline enforces all of these)

- `startNodeId` and every `NEXT:` / `-> target` / `ENDING:` must resolve.
- Every node must be **reachable** from the start — an unreachable node is a dead branch and an error.
- Every ending must be referenced by at least one node, and at least one ending must be reachable.
- **Cycles are allowed** («Ще борщу?» can loop) — but every node on a cycle must still have a path to an ending. A cycle with no exit is a dead trap and an error.
- Bounds: ≤ 60 nodes per dialogue, 2–4 choices per choice point.

### The branch map

`annotate` and `validate` print a **branch map** for every dialogue — a tree of the graph with each line's UK preview, choice fan-out, `⇒ ending` markers, `↩` back-references for already-shown nodes, path-length stats, per-ending reachability, and warnings. Read it after every annotate run: it is the fastest way to see a dangling branch, a lopsided path, or an ending you forgot to wire. It is an authoring aid only — nothing parses it.

### Dialogue gotchas

1. **One sentence per node.** A node is one spoken line. If a character says two sentences, that's two nodes chained with `NEXT:` (each gets its own audio).
2. **Ids are a single namespace.** Node ids and choice ids are sentence ids; they must be unique across the entire pack (stories included). Slug-prefix everything.
3. **Wire every ending.** Defining an ending in frontmatter is not enough — some node must `ENDING:` it, and it must be reachable.
4. **Give loops an exit.** If choices can circle back (great for pushy-mama dinner loops), make sure at least one choice leads onward.
5. **ALT lines are for natural variation**, not for wrong answers — every ALT should mean the same thing as the choice's UK. Branch-changing answers are separate choices.
6. Content guidance: keep choices clearly distinct from each other in _wording_ (the ASR matcher scores against each), and keep player lines speakable — short, natural, rhythmic. Addresses («Мамо», «бабусю») in the vocative make lines sound like real Ukrainian.

### Dialogue audio

`pipeline audio` renders dialogues **per node**: every NPC line becomes its own small Opus file in that node's character voice, written to `audio/<dialogue-id>/<sentence-id>.opus` with its own word stamps (the ≥95 % aligner gate and monotonicity rules apply per node; an untrusted alignment ships that node with no stamps → sentence-level highlight).

- **Character steering**: give a character an optional `audioTag: '[warm]'` in the frontmatter (one or more `[bracketed]` Eleven v3 / v4 tags, same mechanics as a story track's `audioTag`) — it conditions delivery without being spoken. `style` stays a human label. Dialogue renders on the same default model as stories (Eleven v4 — the Sutinki default, UP03; on an untagged model such as Multilingual v2 `language_code uk` is sent and tags are not applied).
- **Audition & seeds group per (dialogue, character)** — not per node. `--audition N` renders N takes of ONE representative line per character (their longest), e.g. `dinner-mini--mama--take1--seed…mp3`; pick a take per character and finalize with `--seed dinner-mini/mama=<seed>`. Pinned seeds reproduce the same take (identical duration + word timing) across runs; the raw PCM is not bit-identical (v3 seeds are take-deterministic, not sample-deterministic).
- **`--player-audio`** additionally renders **coach audio** — every choice, plus any scripted `SPEAKER: player` line — in the reserved `player` character's voice ("hear how to say it"). Omit the flag and no coach files are rendered.
- **Cost gate**: every `audio` run first prints node/choice/request/character counts and asks to proceed; pass `--yes` for scripted runs. An unconfirmed run makes zero ElevenLabs calls.
- `--dialogues <id,id>` filters like `--stories`; pack.json merges across runs, so dialogues and stories of a mixed pack can be rendered in separate batches.

## Reference files

- `UkrainianStories/MyWifeKeepsPeekingAtMeFromAroundCorners/A1/peekingwifea1p1.uk.draft.md` — a real Ukrainian draft in exactly this format (`title: { uk }`, `UK:` lines, U+0027 apostrophes, a `voc.` token); `annotate` + `validate` pass on it. Its _content_ predates the very-early-A1 calibration and is being re-authored by UCT001 — copy its shape, not its sentences.
- `packages/pipeline/fixtures/the-photograph.draft.md` — the canonical full-length story example: a Ukrainian sample pack in draft form; `annotate` reproduces that pack exactly.
- `packages/pipeline/fixtures/m14/` — the M14 category fixtures: `news-090-1/2.draft.md` (`category: news`, `register: anchor`, `subtitle` + `source` on each story → `a2-news-090`), `podcast-090.draft.md` (`podcast` / `host` → `a2-podcast-090`), `comedy-090.draft.md` (`stories` + `genre: comedy` / `narrator` → `a1-comedy-090`); `annotate` reproduces their `packages/schema/fixtures/packs/<id>/pack.json` byte-for-byte.
- `packages/pipeline/fixtures/the-dinner.dialogue.md` — the canonical dialogue example: the T25 fixture pack (Ukrainian) (11 nodes, 2 choice points, 3 endings, a legal loop) in draft form; `annotate` reproduces `packages/schema/fixtures/packs/a2-dialogue-001` exactly.
- `packages/pipeline/fixtures/radio-check.scenario.md` — the canonical scenario example: the T56 fixture pack «Проверка связи» (6 turns, a free slot with a reject reaction, a forms slot branching on `good`/`bad`/`default`, 15 glossary entries, 3 nudges, a placeholder host) in draft form; `annotate` reproduces `packages/schema/fixtures/packs/a1-scenario-fixture` exactly, and its coverage report flags exactly «отлично» and «эфир».
- `packages/pipeline/fixtures/broken/` — deliberately broken drafts showing the big failure classes (missing lemma, misaligned table, dead branch, trap cycle, dangling references) and their error messages.
- `packages/pipeline/fixtures/exam-fixture/` — the canonical exam example (T67): story drafts `rd-01` (a 6-sentence reading text) and `ls-01` (a 5-line two-voice dialogue) + `mock.exam.md` (`a1-mock-fx`, all five subtests in the official order, a few items each — deliberately not official-shape, so `validate` prints six `⚠ official-shape:` lines) + `drill.exam.md` (`a1-drill-fx`, a lexgram drill with `explain` and one `typed`/`half` item); `annotate exam-fixture/*.md` reproduces `packages/schema/fixtures/packs/a1-exam-fixture` exactly.
- `packages/schema/src/pack.ts` + `packages/schema/src/dialogue.ts` (+ `scenario.ts`, `exam.ts`) — the Zod schemas every emitted pack must satisfy (the pipeline runs them for you).

## Content guidance for Sutinki stories

Target reader: an adult learner starting from **zero Ukrainian** who loves Dark-Somnium-style creepypasta. Sutinki's A1 is **very early A1** (ADR-0006) — this is the single most important calibration in this document, and it is _not_ the Russian rungs' A1 (those sit near A2 because Mitch has years of Russian). The measure is the existing Ukrainian sources: `UkrainianStories/*/A1/*_UK.md`, each headed «**Рівень:** дуже ранній A1» — read one part of one of them before authoring anything.

What "very early A1" looks like in those sources, and therefore in a draft:

- **Sentences of 2–5 words.** The median is 3–4. One-word sentences («Ніч.») and two-word sentences («Я сам.», «Або ні?») are normal and _frequent_ — they are the rhythm of the genre. A 7-word sentence is the ceiling and should be rare; if you wrote one, split it.
- **Present tense almost everywhere.** Past appears only where the horror needs it («Я знайшла тебе.», «Пітер був там.») and is tagged `past-tense` honestly. No future beyond «буде»-class one-offs, no conditionals, no participles, no verbal adverbs.
- **No subordination as a rule.** Prefer two sentences, a colon plus direct speech («Я думаю: «Пітер — наркоман».»), or a dash. When a clause is unavoidable it is «що», «коли», «де», or «бо» — one per sentence, never nested, and the sentence still fits the length rule.
- **The house shapes:** the em-dash copula («Пітер — наркоман.», «Моя дружина — Лінн.»); «Це …» sentences («Це просто будинок.»); «У мене є …» / «… немає»; «Мені страшно.»-class predicatives; «— » direct speech with a vocative («— Не йди туди.», «— Мамо, де кіт?»); the repeated sentence with one word changed. These are what the tags cover, and they are what the reader is being trained to see.
- **A tiny, repeating vocabulary.** Each family names its _signature_ words in the source's EN note (peeking-wife: дивитися, усміхатися, ховатися, страшно, кричати; McDonald's: в'язниця, вікно, ґрати, стрибати, падати, тримати, кров, дружина) and repeats them relentlessly — the FSRS engine feeds on repeated encounters in fresh contexts. A part adds a handful of new lemmas and re-encounters last part's.
- **It is fine to cut meaning.** The sources already trimmed dense passages (backstory, technical detail, long inner monologue) to a line or dropped them; the draft never re-expands them. The arc survives; the density does not.
- **Honest `level` per lemma.** A word above A1 in an A1 story is fine _if it is tagged_ («з-за» is A2, «скриня» is B1 — the existing drafts tag them so). An A2 word tagged A1 corrupts the progress model; a sentence is never rewritten to hit a ratio.
- **Dread from implication**, not syntax: what Mom says is _not_ there, who is standing where they should not be, the sentence that comes back with one word changed. Short declaratives are scarier in Ukrainian than long ones — use the language's rhythm.
- **Narratable.** Every sentence becomes ElevenLabs audio, so favour natural speech over textbook stiffness. Vocatives, «— » openers, and «…» pauses all narrate well; very short character runs («— Так?») render fine on `eleven_v3`.
- **Source text is verbatim.** A draft's `UK:` lines are the source part's sentences exactly — the annotation session never "improves" the Ukrainian. The glossary at the end of each source is consumed into `translation` / `note` cells.
- **Honest `level` on the pack and story.** A1 means the rules above; if a part needs more, it is A2 and says so.

### Non-fiction registers (M14)

The news, education, podcast, documentary and travel shelves are fed by the same CT flow (source → Claude adaptation to the target rung → draft with a full token table → `annotate` → `audio` → `publish`); each item is a **story in a story pack** with `category:` on the pack, `register:` on its direction, `source:` on the story (`name` at minimum, `publishedAt` for anything dated) and `subtitle:` when the source has a dek. Style rules per shelf:

- **news** (`register: anchor`): short declarative sentences; the lede first (who / what / where in sentence one); dateline facts — places, dates, numbers; past tense for events, present for standing facts; no first person; `contextCues` for item breaks («А тепер — до погоди.»).
- **education** (`register: lecturer`): definitions via «X — це Y» (tag `zero-copula`, the «це» row as the gloss marker) followed by **one worked example per concept**; imperative address to the learner — «зверніть увагу», «порівняйте», «запам’ятайте»; numbered steps where order matters.
- **podcast** (`register: host`): conversational particles and fillers — «ну», «до речі», «знаєте», «чесно кажучи»; rhetorical questions the host then answers; direct address («напишіть мені», «ви»); a guest speaks through `sentenceVoices` on their lines (a casting decision recorded in the anthology bible).
- **documentary** (`register: voiceover`): measured third person; numbers, dates and measurements stated plainly; place names in full — a multi-word place name is one `name` token per word (the roadwork bible's «Північна Кароліна» rule), and a river / range / city keeps its capital in the lemma.
- **travel** (`register: guide`): second person «ви» throughout; imperatives — «подивіться», «поверніть», «спробуйте»; sensory adjectives (light, smell, sound, texture); the guide's own opinion is allowed («одне з моїх улюблених»).

**News drafts in practice (CT019, the first `category: news` pack):** a news article arrives as an editorially final `ARTICLE.md` whose body carries `[…]` lines of free Ukrainian stage direction («Диктор оголошує новий сюжет:») immediately before a paragraph or a `###` heading; a scratch converter (`Stories/_build/a2-news-001/cues-from-doc.py --cue-kind context`, modes `--strip` / `--rekey` / `--apply` / `--table`, ported from Sumrak's when a news family first needs it) strips them into `stripped/item-NN.txt` (the pack text, byte for byte — headings become plain sentence blocks with no terminal period) and re-keys each to the FIRST sentence of its paragraph as a `contextCues` entry, so the `voice:` block carries only `id` / `register: anchor` / `deliveryNotes` / `contextCues`. Any scratch script with a `[а-я]` word regex must be widened to the Ukrainian charset `[а-щьюяєіїґ'ʼ’]` or words with і/ї/є/ґ and apostrophes vanish from its counts. The reusable contract is `sutinki-content/series/news/SERIES.md` once a news family exists.

**Anthology packs grow by appending** (the SAR-stories rule, `sutinki-content/series/sar-stories/SERIES.md` §2; `LIBRARY_CATEGORIES.md` §6): one open-ended pack per shelf and rung — `a2-news-001`, `a2-edu-001`, `a2-podcast-001`, `a2-doc-001`, `a2-travel-001` (the level prefix follows the rung; a second rung is a new pack id). New items are new drafts appended **after** the existing ones at a `pack.version` bump; old items are never reordered, re-ided or re-rendered; one build dir per pack forever so every earlier opus is carried.

## Scenario drafts (`*.scenario.md` — M17, T56)

A **scenario draft** is one markdown file containing **one blind speaking scenario** («Сценарии», design `docs/design/SPEAKING_SCENARIOS.md` §2 at the workspace root): a host talks to the learner, the learner answers **out loud with no text on screen**, and an offline judge scores the answer against an authored **expectation**. One scenario = one draft file (`type: scenario` pack); the pipeline recognizes it by the `scenario:` frontmatter section, never by filename. Story, dialogue and scenario drafts may share a pack.

Everything from story and dialogue drafts carries over unchanged: the sentence block (RU/EN/GRAMMAR + 7-column token table), the alignment rule, the lemma conventions, NFC, ё. **Every line the cast can speak is a fully annotated sentence** — host lines, the confused/hint/second retry lines, reject reactions, glossary clips and nudges — because T57 renders each of them as its own audio file and the debrief makes them tap-word explorable.

### Frontmatter

Five top-level keys, **all five required**: `pack:`, `scenario:`, `characters:` (≥ 2: the host + `player`), `scene:` and `endings:` (≥ 1). Inside `scene:` every field is optional, but the block itself must exist — the minimal legal form is `scene: { layout: center }` (or an empty `scene: {}`).

```yaml
---
pack:
  id: a1-scn-radio-001
  version: 1
  type: scenario # the pack type for scenario packs
  title: { ru: 'Проверка связи', en: 'Sound Check' }
  level: A1
  tags: ['scenario', 'radio']
scenario:
  id: radio-a1 # unique within the pack; prefixes every generated sentence id
  familyId: radio # the situation shared by the A1/A2/… rungs
  title: { ru: 'Проверка связи', en: 'Sound Check' }
  level: A1
  language: ru # OPTIONAL, ru | uk (default ru)
  brief:
    { ru: 'Короткая проверка связи перед эфиром.', en: 'A short sound check before going on air.' }
  startTurnId: radio-a1-t01 # OPTIONAL — defaults to the first turn block
characters:
  - id: host # exactly ONE character has role: host — the one drawn on screen
    name: { ru: 'Ведущий', en: 'Host' }
    voice: elevenlabs:Daniel # a library voice on the account — never Mr. Wintrow (ADR-0019 decision 6)
    style: radio-host
    role: host # host | npc | player
    portrait: # OPTIONAL art; see below
      placeholder: { kind: man, hue: 25 } # man | woman | youth | elder — the app draws a stand-in
    cues: # OPTIONAL, render-time only (T57): steering for the retry variants
      confused: 'Извини, я не совсем понял. Ты можешь повторить?'
      hint: 'Warmer and slower — the host is helping, not testing.'
  - id: player # RESERVED: the learner, role: player, required; never speaks a scripted line
    name: { ru: 'Вы', en: 'You' }
    voice: elevenlabs:River # the coach voice for accept[0] model answers (T57 --player-audio)
    style: neutral
    role: player
scene: # REQUIRED block; every field inside it is optional
  bed: studio # OPTIONAL room-tone slug (the app owns the known set)
  layout: center # center | left | desk (default center)
  accent: '#c26a3a' # OPTIONAL hex
  # backdrop: scene/backdrop.png   OPTIONAL PNG, 1080×1920
endings:
  - id: end-ok # referenced by turns' ENDING: lines
    title: { ru: 'Связь есть', en: 'Connected' }
    recap: { ru: 'Проверка пройдена.', en: 'Sound check passed.' }
    tone: good # good | bad | strange
---
```

**Portraits.** A character either has `placeholder` (no PNGs needed — this is how every fixture and every pre-art rung ships) or real layers: `body: scene/<id>/body.png` (mouth closed, eyes open), optional `eyelids: scene/<id>/eyelids.png`, and a required `mouthAnchor: { x, y, w, h, rotate? }` in **fractions of the body image** where the SVG mouth is drawn, plus `mouthStyle: default | wide | small | beard`. `body` + `mouthAnchor` are required unless `placeholder` is set. `cues` never reach `pack.json`; they are read from the draft by `pipeline audio` (T57).

### Turn blocks

The body is a sequence of **turn blocks** — one per node of the graph. A turn is 1–3 spoken lines; a **monologue turn** just talks and moves on; a **prompting turn** ends in a question, carries `EXPECT:` + `RETRY:`, and waits for the learner:

```markdown
## radio-a1-t02

SPEAKER: host

SAY:

RU: Отлично.
EN: Great.

| text    | lemma   | translation | pos | grammar     | level | note |
| ------- | ------- | ----------- | --- | ----------- | ----- | ---- |
| Отлично | отлично | great       | adv | predicative | A2    |      |
| .       |         |             |     |             |       |      |

SAY:

RU: Как вас зовут?
EN: What's your name?

| text  | lemma | translation | pos  | grammar                                 | level | note |
| ----- | ----- | ----------- | ---- | --------------------------------------- | ----- | ---- |
| Как   | как   | how         | adv  | interrogative                           | A1    |      |
| вас   | вы    | you         | pron | acc.                                    | A1    |      |
| зовут | звать | (they) call | verb | 3pl. pres. (impf., indefinite-personal) | A1    |      |
| ?     |       |             |      |                                         |       |      |

EXPECT:
slot name required free minTokens=1
accept: Меня зовут Митч. | Я Митч.
reject: хорошо, спасибо -> REACT:

RU: Нет, имя.
EN: No, your name.

| text | lemma | translation | pos  | grammar    | level | note |
| ---- | ----- | ----------- | ---- | ---------- | ----- | ---- |
| Нет  | нет   | no          | part |            | A1    |      |
| ,    |       |             |      |            |       |      |
| имя  | имя   | name        | noun | n.sg. nom. | A1    |      |
| .    |       |             |      |            |       |      |

RETRY:
CONFUSED:

RU: Не расслышал.
EN: Didn't catch that.

| text      | lemma      | translation            | pos  | grammar          | level | note |
| --------- | ---------- | ---------------------- | ---- | ---------------- | ----- | ---- |
| Не        | не         | not                    | part | negation         | A1    |      |
| расслышал | расслышать | caught (heard clearly) | verb | m.sg. past (pf.) | B1    |      |
| .         |            |                        |      |                  |       |      |

HINT:

RU: Скажите: «Меня зовут…».
EN: Say: "My name is…".

| … full token table … |

SECOND:

RU: Например: «Меня зовут Митч».
EN: For example: "My name is Mitch."

| … full token table … |

LIFELINE: «Меня зовут …». | "Меня зовут …" (My name is …).

NEXT: radio-a1-t03
```

Line by line:

- `## <turn-id>` — starts a turn. Kebab-case, unique; convention `<scenario>-t<NN>` with a letter suffix for branch targets (`radio-a1-t04g`, `-t04b`, `-t04d`). **The turn id is the sentence id of its LAST `SAY:` line**; earlier lines are `<turn-id>-a`, `<turn-id>-b`. All of these share the pack-wide sentence-id namespace.
- `SPEAKER: <characterId>` — a `characters:` id; **never `player`**.
- `SAY:` — opens one sentence block (RU/EN/GRAMMAR + token table). Repeat 1–3 times. When the turn has `EXPECT:`, the last `SAY:` is **the prompt**: it is what replays after every retry line.
- `EXPECT:` — makes this a prompting turn. Its indented sub-lines (indentation is cosmetic; the keywords are what count):
  - `slot <id> <required|optional> forms: key=lemma: form, form* | key=lemma: … | number` — a **forms slot**: each option is a branch **key**, the dictionary **lemma** (for FSRS grading), and the accepted **surface forms**; a trailing `*` on a form is a stem glob («голов*»). The parser splits `key=` … at the **first `:`**, so a lemma may contain spaces (`f95=девяносто пятый: девяносто пятый, 95`). A bare `| number` at the end means a numeral also satisfies the slot, with branch key `number`.
  - `slot <id> <required|optional> free [minTokens=N] [cues="зовут, я …"]` — a **free slot**: anything with ≥ N content tokens (stopwords never count); `cues` = phrases at least one of which must appear.
  - `slot <id> <required|optional> number` — a **numeral slot** (1–100 words or digits); its only branch key is `number`.
  - `accept: <paraphrase> | <paraphrase>` — whole-utterance paraphrases; **the first one is the model answer** (debrief + coach audio). Required.
  - `branchOn: <slot-id>` — which slot's matched key drives `NEXT: on …`. Required when the turn branches; must name a forms or number slot (never a free one).
  - `reject: <form>, <form> [-> REACT:]` — a group of **confusables**: forms that mean the answer was the wrong speech act («спасибо» when a name was asked). With `-> REACT:` a sentence block follows: the targeted line played instead of the generic confused line. Up to 4 groups.
- `RETRY:` — required iff `EXPECT:` is present, and inside it **`CONFUSED:`, `HINT:` and `LIFELINE:` are all required**; only `SECOND:` is optional. `CONFUSED:` (miss #1) and `HINT:` (miss #2+) each open a sentence block; `SECOND:` (miss #3+) usually speaks the model answer; `LIFELINE: <ru> | <en>` is the text shown on tap after the second miss (both halves required; escape a literal `|` as `\|`). Their sentence ids are `<turn-id>-conf`, `-hint`, `-sec`; a reaction is `<turn-id>-react` (`-react-2`, … for further groups).
- Then **exactly one** of:
  - `NEXT: <turn-id>` — linear;
  - `NEXT: on good=<turn-id> bad=<turn-id> default=<turn-id>` — **branch by slot key**: ≤ 4 keys, each an option key of the `branchOn` slot (or `number`), plus the mandatory `default` taken when no key matched (or the turn was skipped). Several keys (and `default`) may point at the same turn — a branch point does not need distinct downstream turns;
  - `ENDING: <ending-id>`.

### Glossary

After the turns, a `## glossary` section holds the «Что значит X?» / «Как сказать X?» material — one `###` block per entry:

```markdown
## glossary

### связь | connection | forms: связь, связи, связ* | translit: конекшн, канекшен

EXPLAIN:

RU: Связь — это connection.
EN: «Связь» means connection.

| text       | lemma      | translation | pos     | grammar                      | level | note |
| ---------- | ---------- | ----------- | ------- | ---------------------------- | ----- | ---- |
| Связь      | связь      | connection  | noun    | f.sg. nom.                   | B1    |      |
| —          |            |             |         |                              |       |      |
| это        | это        | is          | pron    | demonstrative (gloss marker) | A1    |      |
| connection | connection | connection  | foreign | English                      |       |      |
| .          |            |             |         |                              |       |      |

HOWTOSAY:

RU: Connection — по-русски «связь».
EN: Connection is «связь» in Russian.

| … full token table … |
```

- Heading: `### <ru headword> | <english> | forms: <form>, <form*> [| translit: <cyrillic>, …] [| id: <slug>]`. `forms` are the surface forms/globs the learner might say when asking «что значит …». `translit` (optional) are **hand-written extras** — how the Russian ASR hears the English word; the pipeline **generates** candidates from the English automatically (`translit.ts`) and merges yours first. `id:` overrides the entry slug, which otherwise comes from the English (`to hear` → `to-hear`).
- Entry id = `<scenario>-gl-<slug>`; the clips are `<entry-id>-ex` (EXPLAIN) and `<entry-id>-how` (HOWTOSAY). Both blocks are required, both spoken by the host.
- The English words inside the clips are ordinary word tokens: `pos: foreign`, lemma = the word, no level, `grammar: English`. Russian «по-русски» is an adverb.

### Nudges

A `## nudges` section with **exactly three** blocks — the host's service lines the engine needs at any turn:

```markdown
## nudges

### silence

RU: Вы там?
EN: Are you there?

| … token table … |

### which-word

…

### dont-know

…
```

`### silence` (25 s of nothing), `### which-word` («что значит …» found nothing), `### dont-know` («как сказать …» found nothing). An optional `SPEAKER:` line names another cast member; the default is the host. Sentence ids: `<scenario>-nudge-<kind>`.

### Graph rules (the pipeline enforces all of these)

- Exactly one `role: host`; the reserved `player` with `role: player`; every `SPEAKER:` resolves and is never `player`.
- `EXPECT:` ⇔ `RETRY:`; exactly one of `NEXT:` / `ENDING:`.
- `NEXT: on …` needs `branchOn:`; every key must be an option key of that slot (`number` for numeral slots and `| number` forms slots); ≤ 4 keys; `default` is mandatory.
- `startTurnId`, every `NEXT:` target (linear, `on`, `default`) and every `ENDING:` must resolve; every turn reachable; every ending referenced; **no dead traps** (cycles are allowed when they keep an exit — the same `analyzeDialogueGraph` as dialogues, through the `scenarioGraphInput` adapter).
- Slot forms: NFC, no punctuation, a glob is one trailing `*`; option keys unique per slot; slot ids unique per turn; glossary ids and headwords unique.
- Bounds: ≤ 40 turns, 1–3 `SAY:` per turn, 1–6 slots per expectation, ≤ 180 glossary entries (120 → 180 in T64, 2026-09-28).
- Audio is all-or-nothing per scenario (T57 renders every line kind at once).

### The branch map and the coverage report

`annotate` and `validate` print a **branch map** for every scenario — the turn tree with the prompt's RU preview, an **expect column** (`[name: free≥1 ✗1]` = one free slot, one reject group; `[mood: good|bad|ok ⇢mood]` = a forms slot with its branch keys, branching on it; `[monologue]`), the `on` edges labelled `mood: good → radio-a1-t04g` and the `default` edge, `⇒ ending` markers, path stats and warnings.

They also print the **glossary coverage report**: every **content lemma the cast says** (turn lines, retry lines, reactions, nudges — glossary clips themselves are not scanned) that no glossary entry covers, with counts and the sentences it occurs in. Content = tokens whose `pos` is `noun`, `verb`, `adj` or `adv`, minus the judge's stopword list (§5.1 `STOP_RU`: «как», «так», «там», «тут», «очень», «спасибо», «пожалуйста», …); `num`, `name` and all function POS never count. A lemma is covered when it equals an entry's headword or one of its `forms` (exact or glob prefix — `forms: зовут, звать` covers the lemma «звать»). **The CT rule is: cover every content lemma the host says**, plus the family's «likely how-to-say» English list from the scripts file — the report is your checklist; it is informational, never a failure.

### Scenario gotchas

1. **The last `SAY:` is the prompt.** Put the question last; the confused/hint lines are followed by that line automatically, so they must never re-ask it themselves.
2. **Ids are one namespace.** `<turn>-a/-b`, `-conf/-hint/-sec`, `-react`, `<scn>-gl-<slug>-ex/-how`, `<scn>-nudge-<kind>` all collide with story and dialogue sentence ids; prefix turn ids with the scenario slug.
3. **`key=lemma: forms`** — the lemma comes before the first colon; forms after it; the whole option ends at the next `|`. A `|` inside a form is not possible (forms are punctuation-free anyway).
4. **`default` is not optional** on a branching `NEXT:` — it is where a skipped turn goes.
5. **Free slots cannot branch.** Branch on a forms or number slot; keep the free slot for names and open answers.
6. **Reject groups are for wrong speech acts**, never for wrong facts (a «спасибо» when a name was asked; not a wrong name).
7. **Confused lines never contain the answer; the hint contains a `Скажите: «…»` pattern; `SECOND:` IS the model answer** (rung rules, scripts file Appendix C).
8. **Every content lemma the host says goes in the glossary** — read the coverage report after every annotate run; the two the fixture leaves out («отлично», «эфир») are there on purpose so the report always has something to show.
9. **`cues:` on a character are render-time only.** They never appear in `pack.json`; T57's `pipeline audio` reads them from the draft.
10. Indentation under `EXPECT:` / `RETRY:` is cosmetic; a sentence block after `REACT:`/`CONFUSED:`/… starts at column 0 like every other block.

### Scenario audio (T57)

> **Scenario host voices — the six fixed voice IDs (Mitch, 2026-10-04).** The six «Сценарии» hosts render ONLY from these ElevenLabs voice ids, no exceptions: Кирилл `8dhAblFTpeeEB1XoNWkd` · Елена Сергеевна `24cpwcP86kWKZVm5xL51` · Оксана `jbdzge6XKKuimi00dJwg` · Витя `KZH0fz8sc0VdgvPJ9sYb` · лейтенант Громов `KCHQFvRLLOBtTYbW6N09` · Незнакомец `ArHXzPPSKFNaYrb6JndW`. Write the raw id into the draft (`voice: 'elevenlabs:8dhAblFTpeeEB1XoNWkd'` — `resolveVoiceId` passes a 20-character id through untouched) rather than the voice's display name: the account keeps retired look-alike designs under similar names, and a name lookup could silently re-cast a host. The per-family drivers `packages/pipeline/_<host>-v4-render.mts` (and `_<host>-a2-v4-render.mts`) pin the same ids. The coach stays `River` on Multilingual v2. Roster + history: `sutinki-content/series/scenarios/SCENARIOS.md` §2.

`pipeline audio` renders a scenario **per line** on Multilingual v2 — every `SAY:`, `CONFUSED:`/`HINT:`/`SECOND:`, `REACT:`, glossary `EXPLAIN:`/`HOWTOSAY:` and nudge becomes its own Opus file in the speaking character's library voice at `audio/<scenario-id>/<sentence-id>.opus`, with word stamps (the ≥95 % aligner gate + monotonicity per line; an untrusted alignment ships that line with no stamps) and a **mouth track** written into the line's `audio.mouth`. The per-line core (`line-audio.ts`) is the one dialogues use; scenarios add the variant steering and the mouth track.

- **Variants and steering.** v2 has no audio tags, so the retry registers are steered by `previous_text` + settings deltas, per SPEAKING_SCENARIOS §3: a `CONFUSED:` line is rendered with the character's `cues.confused` as `previous_text` and **stability −0.1 / style +0.1**; a `HINT:` line with `cues.hint` and **speed 0.95**; every other line (`SAY:`, `SECOND:`, `REACT:`, glossary clips, nudges, coach) renders with the base settings (stability 0.5 · similarity 0.75 · style 0 · speaker boost) and no `previous_text`. When a character has no `cues:` the defaults apply (confused = «Извини, я не совсем понял. Ты можешь повторить?», hint = «Ничего, не спеши. Я помогу — давай ещё раз, медленно.»). The cue text is _conditioning_, never rendered, so it can be Russian or an English stage direction. **What v2 steering actually buys is small**: on the fixture the same text at the same seed came out ~0.2 s longer and ~0.5–1 dB softer as `confused`/`hint` than as plain `say` (`Stories/_build/a1-scenario-fixture/audition/ab/`) — a slower, softer take, not a different emotion. Write the confused/hint _text_ to carry the register; the steering only nudges delivery.
- **Audition & seeds group per (scenario, character)** — `--audition N` renders N takes of the character's **longest line** _and_, when the character has confused lines, N takes of their **longest confused line** (the steering is what the audition decides), e.g. `radio-a1--host--confused--take1--seed…mp3`. Pin with `--seed radio-a1/host=<seed>`; the whole cast of that scenario then renders with that seed.
- **`--player-audio`** additionally renders **coach audio**: `accept[0]` of every `EXPECT:` (the debrief's model answer) in the reserved `player` character's voice — an Ivan/River-class library voice, **never `Mr. Wintrow`** (ADR-0019 decision 6). Coach lines are free text (no annotated sentence), so they ship as `audio/<scenario-id>/<turn-id>-coach.opus` on `turns[].expect.coachAudio` with a duration and a mouth track but **no word stamps**. Omit the flag and no coach files exist; a later filtered run carries existing ones over.
- **`--scenarios <id,id>`** filters like `--dialogues`; `pack.json` merges across runs (lines and coach files already on disk are carried over), so a mixed pack's stories, dialogues and scenarios can be rendered in separate batches.
- **Mouth track** (`mouth-track.ts`, pure): the Opus is decoded to PCM, RMS per 40 ms → dBFS → viseme by the ladder `< −42` → 0 · `< −32` → 1 · `< −24` → 2 · `< −17` → 3 · else 4, with ±2 dB hysteresis so lips don't flicker; when the line's stamps are trusted every window outside a word stamp is forced to `0` (breaths and room tone never move the mouth); the **round rule** encodes windows inside a word whose _first vowel_ is о/у/ю/ё as `4` — the app draws `4` round for such words and wide otherwise (§8.2; stress is ignored on purpose). Track length is fixed from `durationMs` (`ceil(ms / 40)`), never from the sample count.
- **`--mouth-only`** recomputes every mouth track of an already-rendered `<pack-dir>/pack.json` from the Opus files on disk and rewrites `pack.json` — drafts optional, **zero ElevenLabs calls** — for tuning the ladder; it is idempotent on an unchanged ladder (the fixture reproduces byte-identical).
- **Cost gate**: every run prints `N scenario line(s), M scenario coach render(s) — R ElevenLabs request(s), ~C characters` and asks to proceed; `--yes` for scripted runs; an unconfirmed run makes zero calls. **Cost expectations** (fixture «Проверка связи», 54 lines + 2 coach, 1,115 chars): the 2-take audition = 6 requests / 150 chars in 12 s; the full finalize = 56 requests / 1,115 chars in 89 s → 90 s of audio, 444 KB of Opus. A real A1 rung (~120 lines, ~3,000 chars) is therefore ≈ 3 min and ≈ 3 k characters of the plan.
- **`scene/` ships wholesale.** `publish` copies `pack.json`, every line/coach `audio/…opus`, and **every file under `<pack-dir>/scene/`** (any depth, dotfiles skipped) — the PNG layers the portraits/backdrop reference. The size line reports `scene/` separately («of which scene/ 4.68 MB (Wi-Fi-gated PNG layers)»): the app's sync gate treats `scene/` + `.png` like large audio (T58). The CT session copies Mitch's art in from `Stories/scenarios/<family>/art/sized/` — `backdrop.png` → `scene/backdrop.png`, `body.png` → `scene/<host-id>/body.png`, `eyelids2.png` → `scene/<host-id>/eyelids.png` (≈ 4.7 MB per family) — and sets the portrait's `body`/`eyelids`/`mouthAnchor`; **`mouthAnchor` fractions are measured with T61's anchor picker** (dev screen) once it lands; until then keep `placeholder`.

## Exam drafts (`*.exam.md` — M18, T67; re-targeted to the Ukrainian state exam in UT16)

An **exam pack** (`type: exam`; design `docs/design/UKR_EXAM_PREP.md` at the workspace root — **every number in this section comes from its §2**; ADR-0011) holds one or more structured tests — **exam → subtests → parts → items** — in `mock` mode (a shape-faithful timed paper) or `drill` mode (practice with instant feedback). The format is `ukr-state`: the Ukrainian state-language exam («іспит на рівень володіння державною мовою», citizenship form). It is authored as two kinds of file given to `annotate` **together**:

1. **Story drafts** (ordinary `*.draft.md`, everything above applies unchanged) for every reading text, listening script, examiner line and model answer — full 7-column token tables, `pack:` byte-identical across the pack, `voice:` directions for `pipeline audio` (multi-voice listening dialogues via `sentenceVoices`). **Exam audio is story audio**: no other audio exists or is rendered.
2. **One exam draft per exam** (`*.exam.md`): **YAML frontmatter only** — a single `exam:` key (+ an optional `pack:`). The markdown body below the closing `---` is author notes; `annotate` ignores it. The pipeline recognizes an exam draft by the `exam:` key, never by filename.

```bash
pnpm pipeline annotate stories/*.draft.md mock-00.exam.md -o packs/a1-ukrexam-mock-000/pack.json
pnpm pipeline validate packs/a1-ukrexam-mock-000/pack.json     # the four exam reports (below)
pnpm pipeline audio  packs/a1-ukrexam-mock-000/pack.json stories/*.draft.md …   # renders the STORIES, exactly as for a story pack
```

`pack:` in an exam draft follows the extras precedent: **optional next to story drafts** (it must then match them byte-for-byte), **required when the pack has no story drafts** (a grammar-drill bank) — and such a story-less pack's items may carry **no** story refs. Exams appear in `pack.exams` in the order their drafts are given on the command line.

**Pack metadata** (the `pack:` block, top-level sibling of `exam:` in the same frontmatter; `version` is an **integer**, `version: 1`; required keys `id`, `version`, `type`, `title`, `level`, `tags`, `category`). `type: exam`; `category` = the level's shelf: **`ukr-exam-a1` · `ukr-exam-a2` · `ukr-exam-b1` · `ukr-exam-b2` · `ukr-exam-c1`** (default register `lecturer`); `tags` = `ukr-exam` plus exactly the stack tag(s) of the pack — `ukr-exam:lexgram` · `:lexicon` · `:reading` · `:listening` · `:speaking` · `:writing` · `:mock` · `:gate` (`:gate` is reserved for the hotel gate mock and consumed by UT17 — never put it on a drill pack) — and `ukr-exam:<topic>` theme tags. **Pack ids:** `a1-ukrexam-lexgram-001`, `a1-ukrexam-lexicon-001`, `a1-ukrexam-reading-001`, `a1-ukrexam-listening-001`, `a1-ukrexam-writing-speaking-001`, `a1-ukrexam-prompts-001`, `a1-ukrexam-mock-000…004`; A2 `a2-ukrexam-*`; B1 `b1-ukrexam-mock-000`.

### The exam object

```yaml
---
exam:
  id: a1-mock-00 # unique within the pack: a1-mock-NN (mock) or <kind>-<topic> (drill: lg-, rd-, ls-, wr-, sp- + topic)
  format: ukr-state # ukr-state (this section) | torfl (Sumrak's Russian engine, kept parseable, never authored here)
  level: A1 # A1 | A2 | B1 (B2 / C1 have profiles but empty shelves)
  mode: mock # mock | drill
  title: { uk: 'Зразок A1 · 0', en: 'Mock A1 · 0' }
  blurb: 'One line for a drill card.' # OPTIONAL, drills
  subtests: # mocks: listening → reading → writing → speaking (the official order); NO lexgram
    - id: ls # unique within the exam: ls | rd | wr | sp
      kind: listening # listening | reading | writing | speaking   (lexgram: drills only, study-only)
      title: { uk: 'Слухання', en: 'Listening' }
      instructions: { uk: 'Час виконання — 8 хвилин.', en: '8 minutes.' }
      durationMin: 8
      dictionary: false
      navigation: linear # linear (listening, speaking) | free (reading, writing)
      pointsPerItem: 1 # objective subtests: this, or `points` on every item
      maxPoints: 8 # objective: MUST equal Σ item points (a matching item = one point per pair)
      audioPlays: 2 # listening subtests of MOCK exams: REQUIRED (official: each recording twice)
      parts:
        - id: ls-p1 # unique within the subtest
          instructions:
            {
              uk: 'Прослухайте запис. Оберіть правильну відповідь (А, Б або В). Ви прослухаєте кожен запис двічі.',
              en: 'Listen. Choose the correct answer (A, B or C). You hear each recording twice.',
            }
          timeSec: 300 # OPTIONAL — writing / speaking parts: the per-task time budget
          items: […] # ≥ 1
---
```

**Required vs optional — the same for mocks and drills:** an exam needs `id`, `format`, `level`, `mode`, `title`, `subtests` (`blurb` optional). Every subtest needs `id`, `kind`, `title`, `instructions`, `durationMin`, `dictionary`, `navigation`, `maxPoints` and `parts`; `pointsPerItem` is optional (objective subtests need it **or** per-item `points`) and `audioPlays` is optional except on a mock's listening subtest. Every part needs `id`, `instructions`, `items`; `timeSec` is optional. A drill's `durationMin` is the exam-pace budget the app may show, not an enforced timer. **Texts are Ukrainian** (`uk` side of every `{ uk, en }`), UTF-8 NFC, apostrophe as authored; no russisms or surzhyk.

Every item has `id` (**unique per exam**, across subtests; **the official continuous task number** in mocks — `ls01…`, then reading, then `wr44`, `wr45`, `sp46`…; never a sentence id — the two namespaces are separate), `kind`, `topic` (a slug from the taxonomy below — unknown slugs warn, never fail), optional `explain` (shown after answering in drills and in review after a mock) and, on objective items only, optional `points` (overrides `pointsPerItem`).

**Which kinds go where:** `listening` parts hold `choice` / `typed`; `reading` parts hold `choice` / `typed` / `matching`; a `writing` part holds **exactly one** `writing` item (one part per task); `speaking` parts hold only the speaking kinds; `lexgram` (study drills only) holds `choice` / `typed`. **A `ukr-state` mock refuses a `lexgram` subtest** — the real exam has none.

**`choice`** — single choice. `options` 2–4 (unique after lower-casing and space-collapsing), `answer` = the **0-based** index. The `stem` has **at most one gap**: «…» (U+2026), ASCII `...` or `___`. `stemEn` (optional) is the drill-only translation. `variant` (optional display hint — **no new scoring**): `true-false` (**exactly 2** options: Правда / Неправда), `true-false-ns` (exactly 3), `gap-word` / `gap-form` (the cloze kinds of reading tasks 29–38: the stem has **exactly one** gap; word choice / word form).

```yaml
- id: ls01 # listening MC3 — the first item of a part carries the audio; the rest inherit it
  kind: choice
  topic: ls-mc3
  audio: { storyId: ls-01 }
  stem: 'Тарас і Оксана говорять про…'
  options: ['дім', 'роботу', 'погоду']
  answer: 0
- id: ls05 # Правда/Неправда
  kind: choice
  variant: true-false
  topic: ls-tf
  stem: 'Оксана зараз удома.'
  options: ['Правда', 'Неправда']
  answer: 0
- id: rd07 # a gap = word choice
  kind: choice
  variant: gap-word
  topic: rd-gap-word
  passage: { storyId: rd-01, sentenceIds: [uxa1rd01-s02] }
  stem: 'Я … в Києві.'
  options: ['живу', 'їм', 'п’ю']
  answer: 0
  explain: 'жити → я живу; «їсти» і «пити» не підходять за змістом.'
```

**`matching`** (UT16) — reading tasks «доберіть заголовки» (n of m, extras unused: 5-of-7 at B1, 3-of-5 at A1) and «питання ↔ відповіді» (6↔6 at B1). `left` (2–10 items, each a point), `right` (≥ `left` items; extras allowed), `key[i]` = the 0-based index in `right` that `left[i]` matches (**one-to-one**; out-of-range, duplicate or short keys are errors). `variant: headings | qa` is a display hint. Scoring is **per pair** (partial credit): the item is worth `pointsPerItem × left.length` unless it carries `points`; reading's `items` count in the shape check is tasks, i.e. pairs.

```yaml
- id: rd06
  kind: matching
  variant: qa
  topic: rd-qa
  passage: { storyId: rd-01 }
  stem: 'Доберіть до кожного питання відповідь.'
  left: ['Як вас звати?', 'Де ви живете?', 'Де ви працюєте?', 'Хто це?']
  right:
    ['Це моя родина.', 'Я працюю в банку.', 'Мене звати Оксана.', 'Я живу в Києві.', 'Я не знаю.']
  key: [2, 3, 1, 0] # Як вас звати? → «Мене звати Оксана.» …
```

**`typed`** — free text (grammar drills; the real exam has no typed-answer part). `prompt`, `accept` (full credit; normalised through the app's Ukrainian fold, trailing-`*` stem globs allowed), optional `half` (half credit — right meaning, wrong form). Same `passage` / `audio` refs as `choice`.

```yaml
- id: lg04
  kind: typed
  topic: g19
  prompt: 'Тарас у (парк).'
  accept: ['парку', 'парці']
  half: ['парк']
  explain: 'У парку — закінчення -у (місцевий відмінок).'
```

**`writing`** — one task of Письмо. `task` (`{ uk, en }`), `bullets` (≥ 1 of `{ id, text: { uk, en }, cues: [...] }` — the points to cover; **`bullets`, not `points`**, which is the score field), `minSentences` (≥ 1), optional `minWords` / `maxWords` (the official limits: task 44 = a short message 20–50 words at B1 (A2 15–35, A1 10–25); task 45 = a detailed text ≥ 100 words at B1 with **five mandatory points** (A2 50–70, A1 30–50 with 3–4 points)), optional `minQuestions` / `maxQuestions`, optional `model` (the model answer — a story ref, voiced by Obsidian). Mocks: **two writing parts** (`wr-p1` task 44, `wr-p2` task 45) with `timeSec` 900 / 1500 at B1 (A2 600 / 900, A1 480 / 720).

```yaml
- id: wr44
  kind: writing
  topic: wr-message
  task: { uk: 'Напишіть другові записку про себе.', en: 'Write a friend a note about yourself.' }
  bullets:
    - { id: b1, text: { uk: 'хто ви', en: 'who you are' }, cues: ['мене'] }
    - { id: b2, text: { uk: 'де ви живете', en: 'where you live' }, cues: ['живу', 'живемо'] }
  minSentences: 2
  minWords: 10
  maxWords: 25
  model: { storyId: md-note }
```

**`speaking-reply`** / **`speaking-situation`** — the dialogue task (task 48 = the examiner's situation, N candidate replies — **one item per expected reply**, N = 5 at B1, 4 at A2, 3 at A1). `prompt` (**required** story ref: the examiner's line, voiced by Solomiia), `situation` (`{ uk, en }`, **required** on `speaking-situation`), `expect` (**the M17 expectation, verbatim** — `slots` + `accept`, `accept[0]` is the model answer; same slot kinds and form rules as a scenario's `EXPECT:`, written as YAML), `minTokens` (default 4), optional `image`.

```yaml
- id: sp46
  kind: speaking-reply
  topic: sp-dialogue
  prompt: { storyId: ex-01, sentenceIds: [uxa1ex01-s01] }
  expect:
    slots: [{ kind: free, id: a1, required: true, minTokens: 2, cues: ['звати'] }]
    accept: ['Мене звати Оксана.']
```

**`speaking-monologue`** — the photo description (task 46) and the monologue (task 47). `topicTitle` (`{ uk, en }`), `questions` (4–12 of `{ uk, cues: [...] }`), `minSentences` / `maxSentences` = the **phrase targets** (photo: 10 at B1 / 7 at A2 / 5 at A1; monologue: 20–25 at B1 / 12–15 at A2 / 8–10 at A1), `group` (two items sharing a group = «choose one of two topics»; **exactly 2** members — the official B1 monologue is one theme, ungrouped), `prepSec` / `answerSec`, optional `model`. **`image: { file, alt }`** marks a photo-description item: `file` is a pack-relative `.png/.jpg/.jpeg/.webp` (published with the pack; `publish` lists it), `alt` is the plain-text description a speaker should cover. A photo task **without** `image` is flagged by the shape check; the in-app display of the picture waits for the `UT16b-exam-item-images` ticket (the images themselves are a separate sourcing task).

```yaml
- id: sp44 # task 46 — photo description (first speaking part)
  kind: speaking-monologue
  topic: sp-photo
  topicTitle: { uk: 'Фото: родина в парку', en: 'Photo: a family in the park' }
  questions:
    - { uk: 'Хто на фото?', cues: ['люди'] }
    - { uk: 'Де вони?', cues: ['парк'] }
    - { uk: 'Що вони роблять?', cues: ['гуляють'] }
    - { uk: 'Який настрій?', cues: ['радість'] }
  minSentences: 5
  maxSentences: 7
  image: { file: images/photo-01.png, alt: 'Родина гуляє в парку' }
```

**Cues** (writing bullets, monologue questions, speaking slot forms) follow the M17 slot-form rule: NFC, letters/digits/spaces/in-word hyphens only, **no punctuation** (the apostrophe is a letter here), a glob is a single **trailing** `*` (`працю*`).

### Story refs

`passage` (reading), `audio` (listening), `prompt` (speaking) and `model` (writing / monologue) are `{ storyId, sentenceIds?, trackId? }`:

- `storyId` must be a story **in this pack** (one of the story drafts given to the same `annotate` run).
- `sentenceIds` (optional) must exist in that story and be a **contiguous run in story order** (`[s03, s04]`, never `[s04, s03]` or `[s01, s03]`). Absent = the whole story.
- `trackId` (optional) must be one of that story's audio track ids — so it only validates **after** `pipeline audio` has rendered the story; leave it out while drafting (absent = the story's first track).
- **Listening inheritance:** in a listening part, items after the first may omit `audio` and inherit **the part's first item's** `audio` (one recording → several questions). The first item must carry one.
- **Audio is all-or-nothing:** once any story in the pack has a track, every story referenced by an `audio` or `prompt` ref needs one too. Passages and models may stay silent.

### Points arithmetic

Objective subtests (`listening`, `reading`, and study-only `lexgram`): each item is worth its `points`, else the subtest's `pointsPerItem` (× pairs for `matching`), and **Σ must equal `maxPoints`** (±0.001). The official matrix is **1 point per task**: B1 listening 12, reading 31 (maxPoints 12 / 31); A2 10 / 22; A1 8 / 16. Writing and speaking are **rubric %** of the official rubric maximum — items never carry `points`; set `maxPoints` to the rubric total (B1 Письмо 33 = 10 + 23, Говоріння 38 = 14 + 10 + 14; A1/A2 modelled with the same rubric weights). The verdict itself works in percentages (each part × 25 %, **pass = total ≥ 70 %**, no per-part floor — UT17).

### The four reports

`annotate` and `validate` print, for every exam:

- **Matrix map** — subtest → parts → items with kind / topic / points (`matching` prints its pair count, `choice` its variant) and `Σ x / maxPoints ✓`; rubric subtests show `rubric % of N`.
- **Topic census** — items per topic slug. A slug outside the taxonomy below, or listed there under a different subtest kind, is flagged `?` — a warning, never an error (the app renders unknown slugs raw). **Theme slugs are valid under any subtest.**
- **Official-shape check** — for a `mock` with `format: ukr-state`: `⚠ official-shape:` lines for every deviation from `UKR_STATE_<level>_SHAPE` (constants in `packages/schema/src/exam.ts`, each number tagged with its source in `UKR_EXAM_PREP` §2): the four subtests in the order Слухання · Читання · Письмо · Говоріння; per section the task count, `maxPoints`, `durationMin`, `dictionary`, `navigation`, `audioPlays`; writing: two parts, part times, word limits; speaking: three parts, part times, a photo item **with an image**, the monologue phrase targets, the number of dialogue replies. The numbers (items · minutes): **B1** 12·15 / 31·60 / 2·40 / 3·35 (official, `[exam-doc]` `[reg20]`); **A2** 10·11 / 22·45 / 2·25 / 3·23 and **A1** 8·8 / 16·30 / 2·20 / 3·18 are **modelled** — the report says «modelled «за зразком державного іспиту»», and the app shows that label too. Conforming output is `✓ official shape (ukr-state A1 mock, modelled …)`. Drills and `torfl` exams without a shape print «not checked». **Warnings never change the exit code.**
- **Ref table** — every ref → story · sentence span · track, `✓` / `✗`; inherited listening audio is marked `audio↑`.

Schema errors (everything in this section that says "must") fail `annotate` with exit 1 and a `file:line:` pointing at the offending YAML node in the exam draft — ref errors included.

### Taxonomy (slugs; the app owns the labels)

- **Themes** (Standard Catalogue Б, A1 3.1–3.12 `[std §2.4.1.3]`; valid under any subtest): `liudyna` · `dim` · `misto` · `pobut` · `diialnist` · `dozvillia` · `podorozhi` · `kupivlia` · `iidalnia` · `zdorovia` · `pryroda` · `sviata`.
- **Skills:** listening `ls-mc3` · `ls-tf`; reading `rd-heading` · `rd-tf` · `rd-qa` · `rd-gap-word` · `rd-gap-form` · `rd-detail`; writing `wr-message` · `wr-text`; speaking `sp-photo` · `sp-monologue` · `sp-dialogue`.
- **Grammar** (study-only `lexgram` drills): `g01…g38` = the grammar ids of `uk-a1-grammar.md` (e.g. `g19` locative).

### Ids

Story ids: `rd-<NN>` reading texts · `ls-<NN>` listening scripts · `ex-<NN>` examiner lines · `md-<slug>` model answers · `lx-<topic>` lexicon topics. Sentence ids: **`ux<level><kind><NN>-sNN`** with level `a1` / `a2` / `b1` and kind `lg rd ls ws lx pr m<NN>` — e.g. `uxa1rd01-s01` = A1 reading text 01, sentence 01 (the pipeline only enforces pack-wide uniqueness; follow `UKR_EXAM_PREP` §4). Mock part ids are the official blocks: `ls-p1` (MC3) · `ls-p2` (Правда/Неправда) · `rd-p1` (headings) · `rd-p2` (T/F) · `rd-p3` (Q↔A) · `rd-p4` (gap-word) · `rd-p5` (gap-form) · `rd-p6` (MC4).

### Voices (ADR-0012, `docs/design/VOICE_CAST.md`)

Examiner lines — **Solomiia**; instructions and lecturer-style reading texts — **Mr. Wintrow**; model answers (`md-*`) — **Obsidian**; listening speakers rotate the character voices, fixed per item (`sentenceVoices`). Fixture and test packs use Piper `uk_UA` only. Rendering follows `docs/design/RENDER_BUDGET.md`.

### Modelled mocks and the label rule

Only the B1 citizenship form is an official shape; **A1 and A2 mocks are modelled** from it. Every A1/A2 mock row and the hub badge say **«за зразком державного іспиту»** — never imply an official paper. Put a sentence to that effect in the mock's `title.en`/blurb or the pack card when authoring (e.g. `title: { uk: 'Зразок A1 · 0', … }`). A B1 mock is labelled by its pack (a shape-faithful original, not a literal replica).

### Exam gotchas

1. **`answer` is 0-based.** А = 0, Б = 1, В = 2.
2. **Quote YAML strings with `:`, `#`, `«»`, an apostrophe or a leading `-`/`[`/`{`** — `stem: 'Він сказав: «…»'`. Single quotes are safest; a single quote inside is doubled (`'it''s'`) — prefer the typographic apostrophe `’` only if the story text uses it too (one apostrophe style per sentence).
3. **Stems with two blanks are refused** — split the item, or reword one blank into the text.
4. **`bullets` is the writing list; `points` is the score.** A writing or speaking item with `points` is an error.
5. **Give the story drafts in the same `annotate` call** as the exam drafts; an exam draft given alone may carry no story refs.
6. **`trackId` waits for audio** — add it (if at all) after `pipeline audio`; until then omit it.
7. **Mock listening needs `audioPlays`;** drill listening does not (drills replay freely).
8. **Item ids are per exam, not per subtest** — mocks use the official task numbers; drills prefix by subtest (`lg01`, `rd01`, `ls01`, `wr01`, `sp01`).
9. **No `lexgram` in a mock.** Grammar drills are separate `drill` exams in `ukr-exam:lexgram` packs.
10. **A photo item needs its `image` file in the pack directory** — `publish` ships it, and the importer ignores unknown files on older builds.
11. **The body is ignored** — anything below the closing `---` (a key, the answer table you derived, notes) never reaches the pack.

## Course drafts (`*.course.md` — M25, T88)

A **course pack** (`type: course`, ADR-0022, design `docs/design/HOTEL_PATH.md` §2 at the workspace root) is **one floor** of the «Отель «Сумрак»» TORFL course. A floor holds **units** (a lesson of cards, then a scored exercise pool) and a **floor exam** pool. Like an exam pack, it is authored as two kinds of file given to `annotate` **together**:

1. **Story drafts** (ordinary `*.draft.md`, everything above applies unchanged): one story per unit, `<unit-id>-ex`, holding every example, trap right, edge example and check or exercise stem as a full sentence; plus one `floor-exam` story for the floor-exam pool. **No audio** is authored here — the course audio is rendered by the content kit, not by these drafts.
2. **One course draft per pack** (`*.course.md`): **YAML frontmatter only**, so the whole file is a `---` fence, the YAML, and a closing `---` fence — the opening fence on line 1 and the closing fence after the last item. Inside the fences: a `course:` key (the floor), an `items:` list (the scored and check items) and an optional `pack:`. The markdown body below the closing `---` is author notes and is ignored. The pipeline recognizes a course draft by the `course:` key, never by filename. Two course drafts for one pack are an error. A file missing its closing fence fails with `frontmatter is never closed`.

```bash
pnpm pipeline annotate stories/*.draft.md floor-03.course.md -o packs/a1-hotel-f03/pack.json
pnpm pipeline validate packs/a1-hotel-f03/pack.json --manifest ../sutinki-content/manifest.json
```

The pack header (`pack:`) must say `type: course`, `level`, `id` and `version`, and be byte-identical across the story drafts. Use `category` only if the course needs one (course packs never appear on a Library shelf, so usually none).

Markdown bodies in YAML use **block scalars** (`|`), indented deeper than their key. Single-line strings use quotes (see the exam gotchas).

### The course object (the sample below is the YAML **inside** the fences; a real `*.course.md` wraps it in `---` lines, with `items:` after `course:` and the closing `---` last)

```yaml
course:
  ladder: torfl # the course family; a plain id, never a level
  level: A1
  floor: 3 # 0 = Вестибюль; 13 is never a floor (Номер 13 is the mock a1-torfl-mock-004)
  title: { ru: 'Где? О чём?', en: 'Where? About what?' }
  subtitle: { ru: 'Предложный падеж', en: 'Prepositional case' } # optional
  gate: # FIXED values — the validator refuses anything else
    passPercent: 80
    extern:
      passPercent: 90
  practice: # existing drill exams on the shelf, shown as «Практика» on the floor (D16)
    - packId: a1-torfl-lexgram-001
      examId: lg-case-prep
  units: # ≥ 1, in lesson order
    - id: u1 # unique within the pack; never renumbered
      title: { ru: 'в + где?', en: 'в + where?' }
      summary: { en: 'In + where takes the prepositional case.' }
      cards: [...] # the lesson, in order (see the card kinds below); ≥ 1
      exercises: # the scored unit exercise
        size: 4 # items per attempt
        pool: [u1-c01, u1-c02, ...] # item ids; pool ≥ size + 6
  floorExam: # absent ONLY on floor 0
    size: 5
    pool: [fe-c01, ...] # pool ≥ 2 × size
```

`ladder`, `level` and `floor` are plain fields; `gate` values are checked (80 and 90 are the design's D13 values, not defaults you can change). `grammarQuery` on a unit is reserved for a later ticket: leave it out.

### Card kinds (`cards:` of a unit)

A unit's cards run in order. Each card has a `kind` and an `id` unique across the whole pack.

**`explain`** — the long lesson card: the rule in plain English with the Russian terms, an optional ending table, and the voiced examples. At least five `examples` per explain card.

```yaml
- id: u1-x1
  kind: explain
  title:
    { ru: 'В + предложный: мужской и средний род', en: 'In + prepositional: masculine and neuter' }
  body: |
    The prepositional case (предложный падеж) answers где? after в.
    The ending is -е for most masculine and neuter nouns.
  table: # optional: markdown-free cells; every row has as many cells as the header
    caption: 'Окончания'
    header: [род, ending, пример]
    rows:
      - [m., -е, в банке]
      - [n., -е, в кафе]
  examples:
    - sentenceRef: { storyId: u1-ex, sentenceId: u1s01 }
      highlight: [городе] # token surfaces to colour
      why: 'в + где? → предложный' # optional
```

**`check`** — «Проверь себя»: ungraded, one to four item ids, placed after every two or three explain cards. Its items may **not** appear in any scored pool.

```yaml
- id: u1-k1
  kind: check
  items: [u1-k01]
```

**`traps`** — «Ловушки»: every classic trap side by side, ✗ → ✓ with the reason. At least one pair.

```yaml
- id: u1-tr
  kind: traps
  title: { ru: 'Ловушки', en: 'Traps' }
  pairs:
    - wrong: 'Я живу в большой город.'
      right: { storyId: u1-ex, sentenceId: u1s01 } # the correct sentence (in this pack)
      reason: 'the city takes -е after в: в городе'
```

**`edge`** — «Тонкости»: exceptions and the things tests use to trick the learner. A `body` and at least one example.

```yaml
- id: u1-ed
  kind: edge
  title: { ru: 'Тонкости', en: 'Edge cases' }
  body: |
    Some masculine nouns stress the ending in the prepositional (в лесу, в шкафу).
  examples:
    - sentenceRef: { storyId: u1-ex, sentenceId: u1s11 }
      highlight: [Киеве]
```

**`library`** — «Из библиотеки»: one to eight real sentences from **published** packs, each quoted byte-exact so the app can show it even when the source pack is not installed.

```yaml
- id: u1-lib
  kind: library
  quotes:
    - packId: a1-no-end-house-001
      storyId: part-1
      sentenceId: nea1p1-s04
      highlight: [колледже]
      why: 'в + где? → предложный'
      text: 'Мы дружили в колледже.' # copied byte-exact from that pack's pack.json
```

Library quotes come only from packs already in `sutinki-content/manifest.json` (never from a `Stories/**/OpenAI/` folder). `text` is checked against the published sentence by `validate --manifest`.

Every **non-floor-0** unit needs at least one `traps` card and one `edge` card.

### Item kinds (`items:` of the draft)

Items are top-level, each with a unique `id` and a `topic` (a §3.4 slug, as for exams). **Every scored item** needs an `explain` of at least 120 characters, naming in order (a) the trigger, (b) the rule, (c) why each wrong option is wrong.

**`choice`** — exam-style single choice. `stem` with one «…» gap, `stemEn`, `options` (2–4), `answer` (0-based), `explain`, `voiced`. Two options only for the **binary contrasts** (не/нет, в/на, уже/ещё, а/но, слушать/слышать, потому что/поэтому); anything else gets four. A two-option choice off that set is a validate warning.

```yaml
- id: u1-c01
  topic: case-prep
  kind: choice
  stem: 'Я живу в … городе.'
  stemEn: 'I live in a … city.'
  options: [большом, большой, большого, большую]
  answer: 0
  explain: |
    Trigger: в + где?. Rule: the prepositional answers где? with -е for masculine
    and neuter nouns. Why each wrong option is wrong: большой and большого are not
    prepositional; большую is accusative.
  voiced: { storyId: u1-ex, sentenceId: u1s01 }
```

**`typed`** — the learner types the form. `prompt` (may hold one «…» or a bracketed stem), `accept` (≥ 1 full answers, ё/е-tolerant), `half` (right lemma, wrong ending), `explain`, `voiced`.

```yaml
- id: u1-t01
  topic: case-prep
  kind: typed
  prompt: 'Мы сидим в (кафе) ….'
  accept: [кафе]
  half: [кофе]
  explain: |
    ...
  voiced: { storyId: u1-ex, sentenceId: u1s05 }
```

**`trigger`** — find the word that forces the form. `sentence`, `tokens` (≥ 2, the sentence split into words), `answer` (0-based index into `tokens`), `explain`, `voiced`.

```yaml
- id: u1-g01
  topic: case-prep
  kind: trigger
  sentence: 'Я читаю о Москве.'
  tokens: [Я, читаю, о, Москве]
  answer: 2 # о
  explain: |
    ...
  voiced: { storyId: u1-ex, sentenceId: u1s06 }
```

**`transform`** — rewrite the prompt into the target form. `prompt`, `accept` (≥ 1), `half` (optional), `explain`, `voiced`.

```yaml
- id: u1-r01
  topic: case-prep
  kind: transform
  prompt: 'Это мой брат. → Мы говорим о …'
  accept: [брате]
  explain: |
    ...
  voiced: { storyId: u1-ex, sentenceId: u1s09 }
```

**`writing`**, **`speaking-reply`** and **`speaking-situation`** are the exam item shapes (floors 12, 14, 15): they take the same fields as in the exam section, plus `voiced`. Their stories are story drafts of the same pack.

**`voiced`** points at the story sentence whose text is the item's stem **with the gap filled by the correct answer**. The learner hears the right form only after answering. Every scored item has one, and the validate report counts the unvoiced ones.

### The invariants

`annotate` and `validate` refuse a pack that breaks any of these, each with the exact path:

- **a.** Item ids unique across the pack; unit ids unique; card ids unique across the pack.
- **b.** Every item id in a `check`, a unit `pool` or the `floorExam.pool` exists in `items`. Every `sentenceRef`, trap `right`, `voiced` and story ref resolves to a story and sentence **of this pack**.
- **c.** `exercises.pool.length ≥ size + 6`; `floorExam.pool.length ≥ 2 × size`; `floorExam` is absent **only** on floor 0.
- **d.** No item in both a unit pool and the floor-exam pool; a `check` item may not appear in **any** scored pool.
- **e.** Every non-floor-0 unit has a `traps` card and an `edge` card.
- **f.** `gate.passPercent` is 80, `gate.extern.passPercent` is 90, and floor 13 is refused.

Plus the shape rules: `explain` ≥ 120 characters on every scored item; a table row as long as its header; `answer` in range (`choice` options, `trigger` tokens); `quotes` 1–8 per library card; `check` 1–4 items.

Live-manifest checks are **not** schema: `validate --manifest <manifest.json>` (default `../sutinki-content/manifest.json` when present; otherwise a warning line) checks every `practice` ref exists in the manifest with that exam id, and every library quote's `packId/storyId/sentenceId` exists with a **byte-identical** `text`. A broken live ref is printed as `✗` but never changes the exit code.

### The course report

`validate` prints, after the other reports, per unit:

- `cards explain N · check N · traps N · edge N · library N`
- `voiced examples N` — the explain and edge examples
- `pool N (choice a / typed b / trigger c / transform d)` and `size N`

Then the floor exam (`pool N / size N`), the **binary-option** line (warning when a two-option choice is off the binary set), the **voiced** census (warning per unvoiced item), and the live-manifest lines. Warnings never change the exit code; schema errors do.

### Course gotchas

1. **Ids are stable and never renumbered.** A unit id, a card id and an item id are how a learner's progress is kept. Add new ids; never rename one that is published.
2. **The gate values are fixed.** 80 and 90 are the design, not a setting. A pack that writes another number is refused.
3. **Pool arithmetic.** A unit exercise `size: 4` needs a pool of at least 10; a floor exam `size: 5` needs a pool of at least 10. Count before you commit.
4. **No item in two scored pools.** A unit pool and the floor-exam pool of the same floor are disjoint, so the gates measure learning, not memory. A `check` item is in neither.
5. **`answer` is 0-based**, as for exams. `trigger.answer` indexes `tokens`, not the sentence.
6. **`explain` is long on purpose.** Under 120 characters is refused, because the learner needs the trigger, the rule and the reason each wrong option fails, not just the answer.
7. **Quote YAML strings** with `:`, `#`, `«»` or a leading `-`/`[`/`{` — single quotes are safest, and an inner single quote is doubled.
8. **The body is ignored** — anything below the closing `---` never reaches the pack.
