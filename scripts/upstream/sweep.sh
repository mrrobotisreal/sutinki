#!/usr/bin/env bash
# Mechanical gates of the Ukrainian sweep (docs/SUTINKI_UPSTREAM.md §2 step 7). Exit 1 on any failed gate.
# Install at Sutinki/scripts/upstream/sweep.sh (UP01). Run from anywhere inside Sutinki:  scripts/upstream/sweep.sh | tee <evidence>/sweep.txt
# Allowlist: scripts/upstream/ru-allowlist.txt — one bash glob per line, `# owner ticket — removal condition` required.
# A line in any scanned file may carry the marker `upstream-ok` to exempt a deliberate historical mention.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
export LC_ALL=en_US.UTF-8
ALLOW="scripts/upstream/ru-allowlist.txt"
fail=0
allowed() { [ -f "$ALLOW" ] || return 1; local g; while IFS= read -r g; do g=${g%%#*}; g=$(echo $g); [ -z "$g" ] && continue; case "$1" in $g) return 0;; esac; done < "$ALLOW"; return 1; }
filter() { # stdin: grep -n lines (path:line:text) -> prints non-allowlisted, sets nothing
  local line f; while IFS= read -r line; do [ -z "$line" ] && continue; f=${line%%:*}; allowed "$f" || echo "$line"; done
}
gate() { # $1 title, $2 hits(string)
  echo; echo "## $1"
  local bad; bad=$(printf '%s\n' "$2" | grep -v 'upstream-ok' | filter)
  if [ -n "$bad" ]; then printf '%s\n' "$bad" | head -60 | cut -c1-200; echo "FAIL: $(printf '%s\n' "$bad" | grep -c .) hit(s) outside the allowlist"; fail=1; else echo "ok"; fi
}
SRC="apps/mobile/src apps/mobile/modules apps/mobile/plugins apps/mobile/scripts apps/mobile/app.json apps/mobile/tailwind.config.js packages"
EX="--exclude-dir=node_modules --exclude-dir=android --exclude-dir=.expo --exclude-dir=drizzle --exclude=*.md --exclude=pnpm-lock.yaml"

gate "1. Russian-only letters [ёыэъ]" "$(grep -rnI $EX -E '[ёыэъЁЫЭЪ]' $SRC 2>/dev/null || true)"
gate "2. sumrak identifiers" "$(grep -rnIi $EX -E 'sumrak[-_.:/@]|@sumrak|SUMRAK_|io\.winapps\.sumrak|sumrak://|SumrakDB|Sumrak(Widget|Module|API)|sumrak\.db|Сумрак' $SRC 2>/dev/null || true)"
gate "3. Sumrak palette values (ember list + Sumrak neutrals + widget ARGB + rgb triplets)" "$(grep -rnIi $EX -E '#(0B0B0E|141419|1C1C24|26262E|9A97A0|E2C462|9E7A18|F3E6A8|FFD23F|FF9124|FF4A2E|D9C27A|E8B400|EE7A0E|E0361C|B3402F|A03828|E8452F|FF3B1F|E85434|E0602E|FFB347|B07830|C09658|18100C)([^0-9A-Fa-f]|$)|0xFF(0B0B0E|141419|1C1C24|26262E|9A97A0|E2C462|9E7A18|F3E6A8|FFD23F|FF9124|FF4A2E|D9C27A|E8B400|EE7A0E|E0361C|B3402F|A03828)|(^|[^0-9])(232 84 52|255 179 71|176 120 48|192 150 88|24 16 12|158 122 24|226 196 98|179 64 47|160 56 40|11 11 14)([^0-9]|$)' apps/mobile/src apps/mobile/modules apps/mobile/plugins apps/mobile/app.json apps/mobile/tailwind.config.js 2>/dev/null || true)"
gate "4. com.winapps.sutinki (must never appear)" "$(grep -rnI $EX 'com\.winapps\.sutinki' apps packages 2>/dev/null || true)"
gate "5. data-language leftovers (.ru / ru: / xxxRu / _ru / 'ru-en' / normalizeRu / reconstructSentenceRu)" "$(grep -rnI $EX -E "\.ru\b|\bru:|[a-z]Ru\b|_ru\b|'ru-en'|'en-ru'|normalizeRu|reconstructSentenceRu" apps/mobile/src apps/mobile/modules packages --include='*.ts' --include='*.tsx' --include='*.json' --include='*.mjs' --include='*.mts' 2>/dev/null || true)"
echo; [ $fail -eq 0 ] && echo "SWEEP: PASS" || echo "SWEEP: FAIL"
exit $fail
