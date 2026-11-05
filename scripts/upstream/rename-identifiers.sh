#!/usr/bin/env bash
# Mechanical identifier renames for every file the UP merge ADDED or MODIFIED relative to main.
# usage (on the upNN branch, after the merge commit): scripts/upstream/rename-identifiers.sh [base=main]
# Also flips the card-direction literals 'ru-en'/'en-ru' -> 'uk-en'/'en-uk' (ADR-0003). Does NOT touch `.ru` / `titleRu` accessors
# (typecheck drives those) or Cyrillic copy. Review `git diff` after running; commit as `UPNN: identifier renames`.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
base=${1:-main}
files=$(git diff --name-only --diff-filter=AM "$base"...HEAD -- apps packages \
  | grep -E '\.(ts|tsx|js|mjs|mts|json|kt|xml|gradle|md|sh|py)$' | grep -vE 'node_modules|/drizzle/|pnpm-lock' || true)
[ -z "$files" ] && { echo "no files"; exit 0; }
# shellcheck disable=SC2086
perl -pi -e '
  s{\@sumrak/}{\@sutinki/}g;
  s/\bSumrakDB\b/SutinkiDB/g;
  s/\bnormalizeRu\b/normalizeUk/g;
  s/\breconstructSentenceRu\b/reconstructSentenceUk/g;
  s/sumrak-mobile/sutinki-mobile/g;
  s/sumrak-content/sutinki-content/g;
  s/SumrakAPI/SutinkiAPI/g;
  s/io\.winapps\.sumrak/io.winapps.sutinki/g;
  s{sumrak://}{sutinki://}g;
  s/sumrak-(media|backup|review-log|fsrs-params|align)/sutinki-$1/g;
  s/SUMRAK_/SUTINKI_/g;
  s/\x27ru-en\x27/\x27uk-en\x27/g;
  s/\x27en-ru\x27/\x27en-uk\x27/g;
' $files
echo "$files" | wc -l | xargs echo "files touched:"
