#!/usr/bin/env bash
# Range report for one UP. Run from the Sutinki root on the upNN branch BEFORE merging.
# usage: scripts/upstream/range-report.sh <prev-stop> <stop>
# needs: remote `sumrak` fetched. Output is pasted into docs/tickets/evidence/UPNN/range-report.txt
set -euo pipefail
P=$1; S=$2; FORK=350425a
RU='[А-Яа-яЁё]'
echo "## commits (no merges): $(git log --oneline --no-merges "$P..$S" | wc -l) — by ticket"
git log --no-merges --format='%s' "$P..$S" | grep -oE '\bT[0-9]+[a-z0-9]*\b' | sort | uniq -c | sort -k2 -V | awk '{printf "%s×%s  ", $2, $1} END{print ""}'
echo; echo "## diff --stat"; git diff --stat "$P..$S" | tail -1
echo; echo "## overlap with Sutinki's own changes since $FORK (predicted conflicts)"
comm -12 <(git diff --name-only "$P..$S" | sort) <(git diff --name-only "$FORK..HEAD" | sort)
echo; echo "## drizzle migrations in range"
git diff --name-status "$P..$S" -- apps/mobile/drizzle | grep '\.sql' || echo "(none)"
echo; echo "## native / plugin / config files"
git diff --name-only "$P..$S" | grep -E 'modules/|plugins/|app\.json|build\.gradle|tailwind\.config|global\.css|theme/colors' || echo "(none)"
echo; echo "## dependency lines changed"
git diff "$P..$S" -- package.json 'apps/*/package.json' 'packages/*/package.json' | grep -E '^[+-] +"' || echo "(none)"
echo; echo "## Cyrillic lines ADDED per non-test source file (top 30)"
git diff "$P..$S" -U0 -- apps/mobile/src apps/mobile/modules apps/mobile/plugins 'packages/*/src' \
  ':!**/__tests__/**' ':!**/test/**' ':!**/fixtures/**' | awk -v re="$RU" '/^\+\+\+ /{f=substr($2,3)} /^\+[^+]/{ if ($0 ~ re) c[f]++ } END{for(k in c) print c[k], k}' | sort -rn | head -30
echo; echo "## sumrak identifiers ADDED (code + strings, excluding docs/*.md)"
git diff "$P..$S" -U0 -- . ':!*.md' | awk '/^\+\+\+ /{f=substr($2,3)} /^\+[^+]/{ if (tolower($0) ~ /sumrak|сумрак/) print f": "substr($0,2,150)}' | head -60
echo; echo "## Sumrak palette values ADDED (hex + rgb triplets)"
git diff "$P..$S" -U0 -- apps | awk '/^\+\+\+ /{f=substr($2,3)} /^\+[^+]/{ if (toupper($0) ~ /#(0B0B0E|141419|1C1C24|26262E|9A97A0|E2C462|9E7A18|F3E6A8|FFD23F|FF9124|FF4A2E|D9C27A|E8B400|EE7A0E|E0361C|B3402F|A03828|E8452F|FF3B1F|E85434|E0602E|FFB347|B07830|C09658|18100C)|0XFF(0B0B0E|141419|1C1C24|26262E|9A97A0|E2C462|9E7A18|F3E6A8|FFD23F|FF9124|FF4A2E|D9C27A|E8B400|EE7A0E|E0361C|B3402F|A03828)|232 84 52|255 179 71|176 120 48|192 150 88|24 16 12|158 122 24|226 196 98/) print f": "substr($0,2,140)}'
echo; echo "## Russian-specific helpers touched"
git diff "$P..$S" -U0 | grep -E '^\+' | grep -oE 'formatRuDate|ru-numbers|ruPlural|normalizeRu|translit[A-Za-z]*|ru-RU|ru_RU|language: ?.ru.|lang: ?.ru.' | sort | uniq -c | sort -rn
