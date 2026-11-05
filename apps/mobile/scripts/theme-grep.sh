#!/usr/bin/env bash
# Fails if any Sumrak ember / old-neutral hex (or its rgb triple) remains (ADR-0009, UT11).
# Run from anywhere: pnpm theme:grep
cd "$(dirname "$0")/../../.." || exit 2
HEX='#(B3402F|A03828|E8452F|FF3B1F|E85434|E0602E|FF4A2E|FF9124|EE7A0E|E0361C|FFB347|B07830|C09658|18100C|0B0B0E)'
TRI='(^|[^0-9])(179 64 47|160 56 40|11 11 14)([^0-9]|$)'
EXCL=(--exclude-dir=node_modules --exclude-dir=android --exclude-dir=.expo --exclude-dir=dist --exclude=theme-grep.sh --exclude=pnpm-lock.yaml)
out=$(grep -rniE "$HEX" apps packages "${EXCL[@]}" 2>/dev/null; grep -rnE "$TRI" apps packages --include=*.css --include=*.ts --include=*.tsx --include=*.kt --include=*.js "${EXCL[@]}" 2>/dev/null)
if [ -n "$out" ]; then echo "$out"; echo "theme:grep FAILED"; exit 1; fi
echo "theme:grep OK (0 ember / old-neutral hexes)"
