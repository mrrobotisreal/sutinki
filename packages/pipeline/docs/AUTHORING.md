# Authoring drafts for Сутінки (Sutinki)

**This document is self-contained.** If you are a Claude session asked to author a new Ukrainian story draft, everything you need is here: the draft file grammar, the annotation rules, the lemma conventions, the apostrophe rule, the grammar-tag canon, the gotchas, and a complete worked example. You do not need the app, the design doc, or network access — only this doc and the `pipeline` CLI.

Sutinki is the Ukrainian twin of Сумрак (Sumrak). The draft format is Sumrak's with the target-language key renamed `ru` → `uk` end to end (ADR-0003): the sentence line is `UK:`, every bilingual field is `{ uk, en }`, and the text rules are Ukrainian (ADR-0004). A `RU:` line is an error, never silently accepted.

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

# narration (needs ELEVENLABS_API_KEY in the env or a gitignored .env at the
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

**Voice ids must resolve to a voice on the ElevenLabs account** — the resolver matches the alias before " - tagline" in the account's voice list. Copy the id from a recently published draft rather than inventing one; a wrong id fails at the first render call (annotate only shape-checks it). Known-resolving id in the existing Ukrainian drafts: `elevenlabs:VASKO` (Mitch's own cloned voice, first-person narrations). ElevenLabs `eleven_v3` speaks Ukrainian natively; the pipeline sends no language code (a per-voice override exists as a hatch only if a clone misbehaves — a content ticket invokes it, never a draft).

Audio notes: the `voice:` frontmatter drives rendering — `stylePrompt` is fed
to ElevenLabs as `previous_text` (write it **in Ukrainian**, in the story's mood,
as if it were the narrator's preceding lines), `settings` maps to provider voice
settings (`stability`, `style`, `speed`, `similarityBoost`), and `deliveryNotes`
stay human-only. A track whose character alignment can't be trusted ships with
zero word stamps (the app falls back to sentence-level karaoke) — the report
says so; re-render with another seed rather than shipping bad stamps.
Eleven v3 steering (the default model rejects `previous_text`, so `stylePrompt`
is ignored there): `audioTag: '[whispers]'` — one or more `[bracketed]` v3 tags
— is prepended once to the whole track. **Per-sentence cues:**
`audioCues: { <sentence-id>: '[tags]' }` inserts tags right before that sentence
(after its paragraph break) for mid-track mood shifts — e.g.
`audioCues: { pwa1p1-s12: '[calm] [ominous]' }`. Both are **v3-only**
(non-v3 models render the plain text), **render-time only** (tag characters
shift the token spans so word stamps stay exact and are never stamped
themselves), and **never reach `pack.json`**. A cue keyed to a sentence id
that is not in the story is an error, not a skip. Tag characters count toward
the provider's per-request character cap.

**Per-sentence voice override:** `sentenceVoices: { <sentence-id>:
'elevenlabs:<other voice>' }` renders those sentences in a second voice — e.g.
a child's line inside a first-person narration. The story is rendered as
consecutive same-voice runs (each its own provider request), the override runs
are level-matched to the narrator runs' mean level (never boosted into
clipping), the runs are concatenated sample-accurately, and every run's word
stamps are offset by the runs before it so karaoke stays exact across each
seam. The pack still carries **one** track per part; nothing about the
override reaches `pack.json`. Override runs get no narrator `audioTag` — steer
them with an `audioCues` entry on the same id (e.g. `'[calm]'`). An id not in
the story is an error. Per-request character caps apply per run.

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
  grammarTopics: [prepositional-location]
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
  type: stories # stories | course-unit | checkpoint | prompts | dialogue
  title:
    {
      uk: 'Моя дружина дивиться на мене з-за рогу',
      en: 'My Wife Keeps Peeking at Me from Around Corners',
    }
  level: A1 # A1 | A2 | B1 | B2 | C1  (no C2)
  tags: ['creepypasta', 'horror', 'family:peeking-wife', 'grammar:present-tense']
story:
  id: part-1 # unique within the pack
  title: { uk: 'Частина 1. Перший раз', en: 'Part 1. The First Time' }
  level: A1 # may differ from the pack level
voice: # OPTIONAL — voice direction for narration (used by `pipeline audio`)
  - id: pw1-vasko-dread # audio track id this rendition will get
    voice: elevenlabs:VASKO # provider-prefixed voice id
    style: dread # short style label
    audioTag: '[ominous]' # v3 tag(s) prepended to the whole track
    stylePrompt: >- # Ukrainian, in the narrator's voice
      Я говорю тихо і чесно. Мені страшно, але я мушу розповісти все.
    deliveryNotes: >- # free-form notes: pacing, pauses, emphasis
      Slow slightly on the final sentence of the part.
---
```

Rules:

- `pack:` and `story:` are required; `voice:` is optional (add it when you already know how the story should be narrated — `annotate` validates its shape and otherwise ignores it).
- Every bilingual field is `{ uk: '…', en: '…' }`. A `ru:` key anywhere in the frontmatter is a schema error (`Unrecognized key`).
- All ids are lowercase kebab-case (`[a-z0-9-]`), stable forever — never renumber or reuse.
- In a multi-story pack, every draft's `pack:` section must be **byte-identical** in meaning (same id, version, type, title, level, tags) or the pipeline refuses.

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
| `translation` | **Required.** Context-appropriate English gloss of _this occurrence_ («вдома» in «вікно вдома» → "at home" only if that is what it means _here_).                                                                                                                                                                                                                                                                                                         | Must be empty               |
| `pos`         | Recommended. `noun`, `verb`, `adj`, `adv`, `pron`, `prep`, `conj`, `part`, `pred`, `num`, `name`, `interj`. `pred` covers impersonal predicatives — «страшно», «холодно», «треба», «можна», «шкода» in dative-experiencer sentences («мені страшно»), and existential «є» / «немає». «мушу» / «мусити» (_must_) is a `verb`. A short-form adjective with an explicit subject stays `adj` with "short form" noted in `grammar` («я радий», «він готовий»). | Must be empty               |
| `grammar`     | Recommended. Compact notes: `f.sg. nom.`, `1sg. pres. (impf.)`, `+ gen.`, `pf. of казати`, `m.sg. voc.`.                                                                                                                                                                                                                                                                                                                                                  | Must be empty               |
| `level`       | Recommended. CEFR level **of the lemma** (`A1`–`C1`), not of the surface form or the sentence.                                                                                                                                                                                                                                                                                                                                                            | Must be empty               |
| `note`        | Optional. Idiom/culture note shown in the word popup.                                                                                                                                                                                                                                                                                                                                                                                                     | Optional                    |

- **A token is punctuation automatically** when its `text` contains no letters or digits (`.`, `,`, `:`, `«`, `»`, `—`, `…`, `!`, `?`). You never mark it; you only leave its annotation cells empty. Hyphenated words («хто-небудь», «з-за», «будь-який», «по-перше») contain letters, so they are word tokens (keep them as **one** token). An apostrophe inside a word («п'ять», «ім'я») is part of the word — never its own token.
- Missing `lemma` or `translation` on a word token is a **hard error with a line number** — by design the pipeline never auto-fills. `pos`/`grammar`/`level` may be omitted where they genuinely add nothing (e.g. particles), but fill them in as a rule; the app's progress model runs on `level`.
- An empty cell means "absent". To put a literal `|` inside a cell, write `\|`.

### The seven cases in the `grammar` column

Ukrainian has seven cases; abbreviate them consistently — the column renders in the tap-word popup:

| Case             | Abbrev.  | Example row                                           |
| ---------------- | -------- | ----------------------------------------------------- |
| називний (nom.)  | `nom.`   | «кіт» → `m.sg. nom.`                                  |
| родовий (gen.)   | `gen.`   | «кота» in «немає кота» → `m.sg. gen. (after немає)`   |
| давальний (dat.) | `dat.`   | «мені» → `dat. (experiencer)`                         |
| знахідний (acc.) | `acc.`   | «кота» in «бачу кота» → `m.sg. acc. (animate = gen.)` |
| орудний (instr.) | `instr.` | «з дружиною» → `f.sg. instr. (after з)`               |
| місцевий (loc.)  | `loc.`   | «у квартирі» → `f.sg. loc. (after у)`                 |
| кличний (voc.)   | `voc.`   | «Мамо!» → `f.sg. voc.`; «Девіде», «Дідусю»            |

The **vocative** is real and frequent in dialogue («Лінн!», «Крісе!», «синку»); annotate it as `voc.` with the nominative as lemma and tag the sentence `vocative-case`. The locative is what Russian calls prepositional; the coverage **tag** stays `prepositional-location` (a dashboard key), while the **grammar cell** says `loc.`.

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

1. **Verbs → imperfective infinitive in -ти**, with the aspect noted in `grammar` (`1sg. pres. (impf.)`, `3sg. past m. (impf.)`). For a **perfective** form, the lemma is the **perfective infinitive** and `grammar` says `pf. of <impf.>`: «сказала» → lemma «сказати», grammar `3sg. past f.; pf. of казати`. **Reflexive -ся stays in the lemma**: «дивиться» → «дивитися», «усміхається» → «усміхатися», «з'явився» → «з'явитися» (`pf. of з'являтися`). Colloquial «-сь» surface forms («дивлюсь») still lemmatize to the «-ся» infinitive.
2. **Nouns → nominative singular**; plurale tantum stays plural («двері», «окуляри», «гроші») with a `pl. only` note in `grammar`. **Adjectives → masculine nominative singular** («стара» → «старий», «моїй» → «мій»).
3. **Personal pronoun forms → their nominative**: «мене», «мені», «мною» → «я»; «неї», «її» (_her_, object) → «вона»; «його» (_him_) → «він»; «нас» → «ми»; «їх» (_them_) → «вони».
4. **Possessives**: non-declining «його / її / їх(ній)» (_his / her / their_) → itself, tagged `pron`; declining «мій / твій / наш / ваш / свій» → masculine nominative singular («моїй» → «мій», «своєї» → «свій»), tagged `pron`, with adjective-style grammar (`f.sg. loc.`).
5. **Pronoun-adjectives** («цей», «той», «кожен», «весь», «такий», «який») → masculine nominative singular, tagged `pron`, adjective-style grammar (`m.sg. acc. (time expression)`).
6. **Numerals**, cardinal and ordinal («п'ять», «дев'ятий», «п'ятсот») → tagged `num`, lemma = nominative («п'ять», «дев'ятий»); note the **case government on the governed noun's row**: «п'ятсот доларів» → the «доларів» row says `m.pl. gen. (after 5+)`; «два коти» → `m.pl. nom. (after 2–4)`.
7. **Adverbs stay adverbs**, even when historically a frozen noun form: «вдома» → «вдома» (not «дім»), «вранці» → «вранці», «вночі» → «вночі», «додому» → «додому».
8. **«як»** as comparison (_like_) → `conj`; «що» / «коли» / «де» / «бо» opening a subordinate clause → `conj`.
9. **«є» / «немає» / «нема»** → `pred` (existential); «є» as the copula in «він є лікар» is rare and bookish — early-A1 Ukrainian drops the copula (`zero-copula`).
10. **Modal «мушу / мусиш / мусить»** → lemma «мусити», `verb`, tag `modal-musyty`. «треба» / «можна» / «не можна» → `pred`.
11. **Proper names** («Бен», «Лінн», «Аліна») → `name`, lemma = nominative with its capital; a vocative form («Крісе», «Лінн») keeps lemma «Кріс» / «Лінн» and grammar `voc.`.
12. **Interjections and particles** («так», «ні», «ой», «ну», «же», «ж», «не») → `part` / `interj`, lemma = itself; `level` A1 as a rule.

## Gotchas

1. **The apostrophe is sacred** — see [the apostrophe rule](#the-apostrophe-rule). Write U+0027, never rewrite it, one code point per sentence, token text identical to the sentence. (Russian's ё rule has no Ukrainian analogue; Ukrainian has no ё.)
2. **і / ї / и / є / ґ are distinct letters.** «і» (U+0456) is not Latin «i» (U+0069) — a Latin letter inside a Ukrainian word is a silent tokenization landmine (the app's matcher will never find it). Type on a Ukrainian layout; «ґ» («ґанок», «ґудзик») is written where the orthography has it — the app folds ґ→г only when _matching_.
3. **Punctuation is its own row.** «Стук у стіні.» is four tokens: `Стук`, `у`, `стіні`, `.` — forgetting the final period row is the most common alignment error.
4. **Capitalization in `text`, lowercase in `lemma`.** Surface «У» keeps its capital; its lemma is «у». (Proper names keep their capital in the lemma too.)
5. **Glosses are contextual.** `translation` is what the word means _here_, so «стоїть» in «У вікні стоїть людина» is "stands", not "costs". Add the general sense to `note` if it helps.
6. **Sentence ids are pack-wide unique and permanent.** Prefix them with a story slug (`pwa1p1-s01`, `cat-s01`) so two stories in one pack can never collide.
7. **Single spaces only** in `UK:` — a double space is an alignment error. Use « » for quotes (not " "), — for dashes, … for ellipsis; they're all just punctuation tokens. Direct speech opens with «— » (em dash, space) at the start of the line.
8. **The grammar column is reader-facing.** Keep the compact-abbreviation style (`f.sg. nom.`, `m.pl. gen.`, `3sg. pres.`, `voc.`) consistent with existing packs — it renders in the tap-word popup.
9. **«у» / «в» and «і» / «й» alternate for euphony** — author the form that sounds right after the preceding sound («у вікні», «в Одесі»; «Бен і Лінн», «вона й він»); the lemma is «у» / «в» and «і» / «й» as written, never normalized to one.
10. **Vocative is not a typo.** «Мамо», «Бене», «синку» are correct addresses — annotate `voc.`, do not "correct" them to the nominative.

## Grammar tags (Ukrainian canon)

`GRAMMAR:` topics and `grammar:<tag>` pack tags are the dashboard's coverage keys — spell them exactly as listed; a new spelling is a new (empty) coverage bucket. Sumrak's catalog tags apply unchanged except three deliberate renames (the Russian keyword in the tag becomes the Ukrainian one) and two additions.

**Unchanged from Sumrak:** `present-tense` · `past-tense` · `future-tense` · `zero-copula` · `dative-experiencer` · `genitive-negation` · `possession-u-genitive` · `direct-speech` · `question-intonation` · `imperative` · `imperative-negative` · `prepositional-location` (the locative case; the tag keeps Sumrak's name) · `instrumental-with-s` («з / зі / із» + instr.; the tag keeps Sumrak's name) · `numbers-genitive` · `ordinal-numbers` · `time-expressions` · `verbs-of-motion-unidirectional` · `verbs-of-motion-multidirectional` · `verbs-of-motion-prefixed` · `reflexive-verbs` · `short-adjectives` (rare in Ukrainian — keep for the «радий / готовий / повинен» class) · the six-case-journey unit tags `existential-est`, `gender`, `accusative-direct-object`, `animacy`, `dative-indirect-object`, `age-dative`, `instrumental-tool`.

**Renamed:** `comparison-kak` → **`comparison-yak`** («як» comparisons) · `purpose-chtoby` → **`purpose-shchob`** («щоб» clauses) · `relative-kotoryj` → **`relative-yakyi`** («який / яка / яке / які» relatives).

**New:** **`modal-musyty`** («мушу / мусити» — must) · **`vocative-case`** (any sentence with a `voc.` token).

Do not invent parallel spellings (`locative-location`, `instrumental-with-z`, `vocative` are **not** canon — the pre-UT02 drafts on disk use them and are re-authored by UCT001). Very-early-A1 stories will lean on a handful: `present-tense`, `zero-copula`, `possession-u-genitive`, `genitive-negation`, `dative-experiencer`, `direct-speech`, `question-intonation`, `prepositional-location`, `vocative-case`.

## Complete worked example

A valid two-sentence draft, start to finish:

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
  - id: cat-vasko-dread
    voice: elevenlabs:VASKO
    style: dread
    audioTag: '[ominous]'
    stylePrompt: >-
      Я говорю тихо. Я не хочу в це вірити.
---

# Кіт — The Cat

## cat-s01

UK: У мене є кіт.
EN: I have a cat.
GRAMMAR: possession-u-genitive, present-tense

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
```

Run it:

```bash
env -u NODE_OPTIONS pnpm pipeline annotate the-cat.draft.md -o pack.json
# ✓ a1-example-001 v1 → pack.json
#   1 story, 2 sentences, 13 tokens — schema-valid
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

- **Character steering**: give a character an optional `audioTag: '[warm]'` in the frontmatter (one or more `[bracketed]` Eleven v3 tags, same mechanics as a story track's `audioTag`) — it conditions delivery without being spoken. `style` stays a human label.
- **Audition & seeds group per (dialogue, character)** — not per node. `--audition N` renders N takes of ONE representative line per character (their longest), e.g. `dinner-mini--mama--take1--seed…mp3`; pick a take per character and finalize with `--seed dinner-mini/mama=<seed>`. Pinned seeds reproduce the same take (identical duration + word timing) across runs; the raw PCM is not bit-identical (v3 seeds are take-deterministic, not sample-deterministic).
- **`--player-audio`** additionally renders **coach audio** — every choice, plus any scripted `SPEAKER: player` line — in the reserved `player` character's voice ("hear how to say it"). Omit the flag and no coach files are rendered.
- **Cost gate**: every `audio` run first prints node/choice/request/character counts and asks to proceed; pass `--yes` for scripted runs. An unconfirmed run makes zero ElevenLabs calls.
- `--dialogues <id,id>` filters like `--stories`; pack.json merges across runs, so dialogues and stories of a mixed pack can be rendered in separate batches.

## Reference files

- `UkrainianStories/MyWifeKeepsPeekingAtMeFromAroundCorners/A1/peekingwifea1p1.uk.draft.md` — a real Ukrainian draft in exactly this format (`title: { uk }`, `UK:` lines, U+0027 apostrophes, a `voc.` token); `annotate` + `validate` pass on it. Its _content_ predates the very-early-A1 calibration and is being re-authored by UCT001 — copy its shape, not its sentences.
- `packages/pipeline/fixtures/the-photograph.draft.md` — the canonical full-length story example in draft form; `annotate` reproduces `packages/schema/fixtures/packs/a1-creepypasta-002` exactly. **Its text is still Russian** (the fork's fixture content is replaced wholesale in UT09); the keys are `uk`.
- `packages/pipeline/fixtures/the-dinner.dialogue.md` — the canonical dialogue example (11 nodes, 2 choice points, 3 endings, a legal loop); `annotate` reproduces `packages/schema/fixtures/packs/a2-dialogue-001` exactly. Same caveat: Russian text, `uk` keys, until UT09.
- `packages/pipeline/fixtures/broken/` — deliberately broken drafts showing the big failure classes (missing lemma, misaligned table, dead branch, trap cycle, dangling references) and their error messages.
- `packages/schema/src/pack.ts` + `packages/schema/src/dialogue.ts` — the Zod schemas every emitted pack must satisfy (the pipeline runs them for you).

## Content guidance for Sutinki stories

Target reader: an adult learner starting from **zero Ukrainian** who loves Dark-Somnium-style creepypasta. Sutinki's A1 is deliberately **very early A1** — far simpler than Sumrak's near-A2 Russian A1 rungs (ADR-0006). For A1 story packs:

- **Sentences of 3–6 words**, present tense throughout (a past-tense «сказала» / «побачив» may appear only where the horror needs it, tagged honestly). No participles, no verbal adverbs, no conditionals.
- **Subordinate clauses only with «що», «коли», «де», «бо»** — one per sentence at most, never nested. Prefer two short sentences over one joined one.
- **A tiny, repeating vocabulary.** A part reuses its own words relentlessly (the FSRS engine feeds on repeated encounters in fresh contexts); a new part adds a handful of new lemmas, drawn from the A1 core, and re-encounters last part's. Tag `level` per lemma honestly — an A2 word in an A1 story is fine _if it is tagged A2_; an A2 word tagged A1 corrupts the progress model.
- **Dread from implication**, not syntax: what Mom says is _not_ there, who is standing where they shouldn't be, the sentence that repeats with one word changed. Short declaratives are scarier in Ukrainian than long ones — use the language's rhythm.
- Sentences should be **narratable**: they become ElevenLabs audio, so favor rhythm and natural speech over textbook stiffness. Vocatives, «— » direct speech, and «…» pauses all narrate well.
- **Honest `level` on the pack and story** — A1 means the rules above; if a part needs more, it is A2 and says so.
- Tag grammar topics from the canon, consistently — they drive the "what needs work" recommendations.
