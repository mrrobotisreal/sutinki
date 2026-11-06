#!/usr/bin/env bash
# Idempotent: renames Sumrak's widget module to SutinkiWidget and applies the Sutinki palette + copy.
# usage (from the Sutinki root or a worktree): scripts/upstream/rename-widget.sh
# UP07 re-runs it on files Sumrak changes under the old path (modules/sumrak-widget).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)/apps/mobile/modules"
if [ -d sumrak-widget ]; then
  if [ -d sutinki-widget ]; then echo "both module dirs exist: merge by hand"; exit 1; fi
  git mv sumrak-widget sutinki-widget
fi
M=sutinki-widget
[ -d $M/android/src/main/java/expo/modules/sumrakwidget ] && git mv $M/android/src/main/java/expo/modules/sumrakwidget $M/android/src/main/java/expo/modules/sutinkiwidget
for f in $(find $M -type f -name '*umrak*'); do git mv "$f" "$(dirname "$f")/$(basename "$f" | sed 's/SumrakWidget/SutinkiWidget/; s/sumrak_widget/sutinki_widget/')"; done
files=$(find $M -type f \( -name '*.kt' -o -name '*.xml' -o -name '*.gradle' -o -name '*.json' -o -name '*.ts' -o -name '*.md' \))
# shellcheck disable=SC2086
perl -pi -e '
  s/expo\.modules\.sumrakwidget/expo.modules.sutinkiwidget/g;
  s/SumrakWidget/SutinkiWidget/g;
  s/sumrak_widget/sutinki_widget/g;
  s/sumrak_snapshot_rev/sutinki_snapshot_rev/g;
  s/sumrak-widget/sutinki-widget/g;
  s{sumrak://}{sutinki://}g;
  s/io\.winapps\.sumrak/io.winapps.sutinki/g;
  s/`sumrak` scheme/`sutinki` scheme/g;
  s/Открой Сумрак/Відкрий Сутінки/g;
  s/для Сумрак:/для Сутінок:/g;
  s/Сумрак home-screen/Сутінки home-screen/g;
  s/«открой приложение»/«відкрий застосунок»/g;
  s/«Открой Сумрак»/«Відкрий Сутінки»/g;
  s/"открой приложение"/"відкрий застосунок"/g;
  s{<string name="sutinki_widget_label">Сумрак</string>}{<string name="sutinki_widget_label">Сутінки</string>};
  s{Streak, due reviews and today\\\x27s goal}{Серія, повторення й мета на сьогодні};
  s/"\$\{snap\.dueCount\} к повторению"/"\${snap.dueCount} до повторення"/g;
  # palette (mirror of src/theme/colors.ts)
  s/0xFF0B0B0E/0xFF0A0E16/g; s/0xFF141419/0xFF121926/g; s/0xFF9A97A0/0xFF98A0B3/g;
  s/0xFFB3402F/0xFFE9C032/g; s/0xFF26262E/0xFF253047/g; s/0xFFA03828/0xFF856600/g;
  s/#0B0B0E/#0A0E16/g;
' $files
echo "widget module renamed/palette applied"
