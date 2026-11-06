#!/usr/bin/env python3
"""Forced alignment of known words against audio (T80; Ukrainian port UT15).

Usage: forced_align.py (--audio FILE --words words.json --out out.json | --jobs jobs.json)
                       [--engine ctc-uk|ctc-ru|whisper] [--language uk|ru] [--device cpu|mps]
                       [--model HF_ID_OR_PATH] [--revision HASH] [--apostrophe keep|drop]
  words.json: [{"id": "<anything>", "text": "<surface>"} ...]  (reading order)
  out.json:   {"engine": ..., "words": [{"id", "startMs", "endMs", "aligned": bool}]}

Engines:
  ctc-uk   (default, --language uk) wav2vec2 Ukrainian CTC (model = $SUTINKI_ALIGN_MODEL or --model, default
           UK_DEFAULT_MODEL, revision pinned) + torchaudio.functional.forced_align. No folding to Russian letters:
           the full Ukrainian alphabet (і ї є ґ) is kept; apostrophes (' ʼ ’ ‘) are normalised to the model's
           apostrophe token when its vocab has one (else dropped). A model id ending in «:ukr» is an MMS adapter.
  ctc-ru   Russian CTC (upstream compat, --language ru only; folds nothing for Russian text).
  whisper  faster-whisper word timestamps (language from --language) matched to the known words
           (difflib). Bake-off baseline and the independent judge.
CTC token spans are PEAKY (the word end lands early) — stamp-audit.ts extends by energy.

Words with no Cyrillic letters (digits, Latin) cannot be aligned by the CTC
model: they are interpolated between aligned neighbours (aligned=false).
Runtime: python3.12 venv with torch, torchaudio, transformers, numpy
(+ faster-whisper for the whisper engine). Never needs an API key.
"""
import argparse, json, re, subprocess, sys

import os, unicodedata

RU_MODEL = "jonatasgrosman/wav2vec2-large-xlsr-53-russian"  # intentional --language ru compat (upstream merges)
UK_DEFAULT_MODEL = os.environ.get("SUTINKI_ALIGN_MODEL_DEFAULT", "robinhad/wav2vec2-xls-r-300m-uk")
UK_DEFAULT_REVISION = os.environ.get("SUTINKI_ALIGN_REVISION_DEFAULT", "")
SR = 16000
APOS = "'ʼ’‘`´"  # every apostrophe spelling seen in authored text / ElevenLabs output
UK_LETTERS = "абвгдежзийклмнопрстуфхцчшщьюяєіїґ"


def load_audio(path):
    import numpy as np
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype="<f4").copy()


def apostrophe_token(vocab):
    """The model's own apostrophe token (ASCII ' or typographic ’), or None."""
    for c in ("'", "’", "ʼ"):
        if c in vocab:
            return c
    return None


def clean(word, language="uk", apos=None):
    """Alignable characters of a surface word. uk: NFC, lower-case, full Ukrainian alphabet kept (no folding to
    Russian letters); apostrophes become `apos` (the model's token) or are dropped when `apos` is None.
    ru: upstream behaviour (а–я + ё)."""
    w = unicodedata.normalize("NFC", word).lower()
    if language == "ru":
        return "".join(c for c in w if "а" <= c <= "я" or c == "ё")
    out = []
    for c in w:
        if c in UK_LETTERS:
            out.append(c)
        elif c in APOS and apos:
            out.append(apos)
    return "".join(out)


def interpolate(out, total_ms):
    n = len(out)
    i = 0
    while i < n:
        if out[i]["aligned"]:
            i += 1
            continue
        j = i
        while j < n and not out[j]["aligned"]:
            j += 1
        lo = out[i - 1]["endMs"] if i > 0 else 0
        hi = out[j]["startMs"] if j < n else total_ms
        k = j - i
        span = max(0, hi - lo)
        for m in range(k):
            out[i + m]["startMs"] = lo + span * m // k
            out[i + m]["endMs"] = lo + span * (m + 1) // k
        i = j


_CTC = {}


def ctc_model(device, model_id, revision):
    """(processor, model, vocab). `id:ukr` = an MMS adapter language. Offline once cached (HF_HUB_OFFLINE=1)."""
    key = (device, model_id, revision)
    if key not in _CTC:
        from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
        mid, _, lang = model_id.partition(":")
        kw = {"revision": revision} if revision else {}
        if lang:
            kw["target_lang"] = lang
        proc = Wav2Vec2Processor.from_pretrained(mid, **kw)
        mkw = dict(kw)
        if lang:
            mkw["ignore_mismatched_sizes"] = True
        model = Wav2Vec2ForCTC.from_pretrained(mid, **mkw).to(device).eval()
        _CTC[key] = (proc, model, proc.tokenizer.get_vocab())
    return _CTC[key]


def run_ctc(audio, words, device, language, model_id, revision):
    import numpy as np, torch, torchaudio.functional as F
    proc, model, vocab = ctc_model(device, model_id, revision)
    blank = vocab.get("<pad>", vocab.get("[PAD]"))
    apos = apostrophe_token(vocab)
    # Emissions in 20 s windows with 2 s context each side, centre parts stitched.
    win, ctx = 20 * SR, 2 * SR
    frames = []
    pos = 0
    with torch.inference_mode():
        while pos < len(audio):
            a0, a1 = max(0, pos - ctx), min(len(audio), pos + win + ctx)
            x = audio[a0:a1]
            x = (x - x.mean()) / (x.std() + 1e-7)
            lg = model(torch.from_numpy(x)[None].to(device)).logits[0].float().log_softmax(-1).cpu()
            f0 = int(round((pos - a0) / 320))
            f1 = lg.shape[0] if pos + win >= len(audio) else int(round((pos + win - a0) / 320))
            frames.append(lg[f0:f1])
            pos += win
    em = torch.cat(frames)  # [T, V]
    total_ms = int(len(audio) * 1000 / SR)
    toks, owner = [], []
    for wi, w in enumerate(words):
        for c in clean(w["text"], language, apos):
            if c in vocab:
                toks.append(vocab[c])
                owner.append(wi)
    out = [{"id": w["id"], "startMs": 0, "endMs": 0, "aligned": False} for w in words]
    if toks and em.shape[0] >= len(toks):
        ali, _ = F.forced_align(em[None], torch.tensor([toks], dtype=torch.int32), blank=blank)
        spans = F.merge_tokens(ali[0], torch.exp(em.gather(1, ali[0][:, None])[:, 0]))
        assert len(spans) == len(toks), (len(spans), len(toks))
        for sp, wi in zip(spans, owner):
            s, e = sp.start * 20, (sp.end) * 20
            o = out[wi]
            if not o["aligned"]:
                o.update(startMs=s, endMs=e, aligned=True)
            else:
                o["endMs"] = e
    interpolate(out, total_ms)
    return out


_WH = {}


def run_whisper(audio_path, words, language, whisper_model, device="cpu"):
    import difflib
    from faster_whisper import WhisperModel
    if whisper_model not in _WH:
        _WH[whisper_model] = WhisperModel(whisper_model, device="cpu", compute_type="int8")
    m = _WH[whisper_model]
    segs, _ = m.transcribe(audio_path, language=language, word_timestamps=True,
                           condition_on_previous_text=False)
    ww = [(clean(x.word, language), x.start, x.end) for s in segs for x in s.words if clean(x.word, language)]
    ref = [(clean(w["text"], language), i) for i, w in enumerate(words) if clean(w["text"], language)]
    sm = difflib.SequenceMatcher(None, [w[0] for w in ww], [r[0] for r in ref], autojunk=False)
    out = [{"id": w["id"], "startMs": 0, "endMs": 0, "aligned": False} for w in words]
    for b in sm.get_matching_blocks():
        for k in range(b.size):
            _, s, e = ww[b.a + k]
            out[ref[b.b + k][1]].update(startMs=int(s * 1000), endMs=int(e * 1000), aligned=True)
    interpolate(out, int(len(load_audio(audio_path)) * 1000 / SR))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio")
    ap.add_argument("--words")
    ap.add_argument("--out")
    ap.add_argument("--jobs", help="JSON [{audio, words, out}] — one model load for many tracks")
    ap.add_argument("--engine", default=None, choices=["ctc-uk", "ctc-ru", "whisper"])
    ap.add_argument("--language", default="uk", choices=["uk", "ru"])
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--model", default=os.environ.get("SUTINKI_ALIGN_MODEL") or None)
    ap.add_argument("--revision", default=os.environ.get("SUTINKI_ALIGN_REVISION") or None)
    ap.add_argument("--whisper-model", default=os.environ.get("SUTINKI_ALIGN_WHISPER") or "Systran/faster-whisper-large-v3")
    a = ap.parse_args()
    engine = a.engine or ("ctc-ru" if a.language == "ru" else "ctc-uk")
    if engine == "ctc-ru" and a.language != "ru":
        sys.exit("ctc-ru is the Russian model: use --language ru (it cannot align Ukrainian)")
    if engine == "ctc-uk" and a.language != "uk":
        sys.exit("ctc-uk aligns Ukrainian only")
    model = a.model or (RU_MODEL if engine == "ctc-ru" else UK_DEFAULT_MODEL)
    revision = a.revision or (UK_DEFAULT_REVISION or None if engine == "ctc-uk" and not a.model else None)
    jobs = (json.load(open(a.jobs, encoding="utf-8")) if a.jobs
            else [{"audio": a.audio, "words": a.words, "out": a.out}])
    for j in jobs:
        words = json.load(open(j["words"], encoding="utf-8"))
        if engine == "whisper":
            res = run_whisper(j["audio"], words, a.language, a.whisper_model)
        else:
            res = run_ctc(load_audio(j["audio"]), words, a.device, a.language, model, revision)
        json.dump({"engine": engine, "model": model, "revision": revision, "language": a.language, "words": res},
                  open(j["out"], "w", encoding="utf-8"))
        print("aligned", j["audio"], len(words), flush=True)


if __name__ == "__main__":
    sys.exit(main())
