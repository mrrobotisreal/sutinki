import type { MatchingItem } from '@sutinki/schema';
import * as React from 'react';
import { Pressable, Text as RNText, Vibration, View } from 'react-native';

import { Text } from '@/components/ui/text';

import { OPTION_LETTERS, matchingCorrect } from '../scoring';
import type { ItemFeedback } from './choice-item-view';
import { StemText } from './stem-text';

/**
 * Matching (UT16b, UKR_EXAM_PREP §5): `left[i]` ↔ `right[key[i]]` — headings
 * (n of m, extras unused) and question↔answer are the same shape. The right-hand
 * list is lettered (А, Б, В …); every left row carries a strip of letter chips,
 * one pick per row. `feedback: 'instant'` (drills) adds «Перевірити» — pairs
 * turn green/red, the right letter of a miss is shown — and `onSubmit` fires once
 * with the picks. `feedback: 'none'` (UT17 mocks) records every change via
 * `onChange` and never reveals anything.
 */
export function MatchingItemView({
  item,
  feedback,
  onSubmit,
  onChange,
  initialPicks,
  showStemEn = false,
}: {
  item: MatchingItem;
  feedback: ItemFeedback;
  onSubmit?: (picks: (number | null)[]) => void;
  onChange?: (picks: (number | null)[]) => void;
  initialPicks?: readonly (number | null)[];
  showStemEn?: boolean;
}) {
  const [picks, setPicks] = React.useState<(number | null)[]>(() =>
    item.left.map((_, i) => initialPicks?.[i] ?? null),
  );
  const [checked, setChecked] = React.useState(false);
  const instant = feedback === 'instant';
  const correct = checked ? matchingCorrect(item, picks) : null;

  const pick = (row: number, idx: number) => {
    if (checked) return;
    const next = picks.map((p, i) => {
      if (i === row) return p === idx ? null : idx;
      // one `right` per `left`: picking a taken letter frees it elsewhere
      return p === idx ? null : p;
    });
    setPicks(next);
    onChange?.(next);
  };

  const check = () => {
    if (checked) return;
    setChecked(true);
    const allRight = matchingCorrect(item, picks).every(Boolean);
    Vibration.vibrate(allRight ? 8 : 24);
    onSubmit?.(picks);
  };

  return (
    <View className="gap-5" testID={`matching-${item.id}`}>
      <View className="gap-2 rounded-2xl border border-border bg-surface px-5 py-5">
        <StemText stem={item.stem} />
        {showStemEn && item.stemEn ? (
          <Text variant="caption" className="font-reading-italic">
            {item.stemEn}
          </Text>
        ) : null}
      </View>

      <View className="gap-2 rounded-2xl border border-border bg-surface px-4 py-4">
        {item.right.map((text, idx) => (
          <View key={idx} className="flex-row items-start gap-3">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-surface-2">
              <RNText className="font-ui-bold text-sm text-text-muted">
                {OPTION_LETTERS[idx] ?? idx + 1}
              </RNText>
            </View>
            <RNText className="flex-1 font-reading text-base text-text">{text}</RNText>
          </View>
        ))}
      </View>

      <View className="gap-3">
        {item.left.map((text, row) => {
          const status = correct ? (correct[row] ? 'ok' : 'bad') : null;
          return (
            <View
              key={row}
              className={`gap-2 rounded-xl border px-4 py-3 ${
                status === 'ok'
                  ? 'border-success bg-success/15'
                  : status === 'bad'
                    ? 'border-danger bg-danger/15'
                    : 'border-border bg-surface'
              }`}
              testID={`matching-row-${row}`}
            >
              <RNText className="font-reading text-lg text-text">
                {row + 1}. {text}
              </RNText>
              <View className="flex-row flex-wrap gap-2">
                {item.right.map((_, idx) => {
                  const selected = picks[row] === idx;
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => pick(row, idx)}
                      disabled={checked}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: checked }}
                      accessibilityLabel={`${row + 1} — ${OPTION_LETTERS[idx] ?? idx + 1}`}
                      testID={`matching-pick-${row}-${idx}`}
                      className={`h-10 w-10 items-center justify-center rounded-full border ${
                        selected
                          ? 'border-accent bg-accent-soft'
                          : 'border-border active:bg-surface-2'
                      }`}
                    >
                      <RNText
                        className={`font-ui-bold text-sm ${selected ? 'text-accent' : 'text-text-muted'}`}
                      >
                        {OPTION_LETTERS[idx] ?? idx + 1}
                      </RNText>
                    </Pressable>
                  );
                })}
              </View>
              {status === 'bad' && (
                <Text variant="caption" testID={`matching-answer-${row}`}>
                  Правильно: {OPTION_LETTERS[item.key[row]!] ?? item.key[row]! + 1}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {instant && !checked && (
        <Pressable
          onPress={check}
          disabled={picks.every((p) => p === null)}
          accessibilityRole="button"
          testID="matching-check"
          className={`items-center rounded-full px-4 py-3 ${
            picks.every((p) => p === null) ? 'bg-surface-2' : 'bg-accent active:opacity-80'
          }`}
        >
          <Text
            className={`font-ui-medium ${picks.every((p) => p === null) ? 'text-text-muted' : 'text-bg'}`}
          >
            Перевірити
          </Text>
        </Pressable>
      )}
    </View>
  );
}
