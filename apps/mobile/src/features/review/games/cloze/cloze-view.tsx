import * as React from 'react';
import { Pressable, Text as RNText, TextInput, Vibration, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { track } from '@/services/analytics';
import { useAppTheme } from '@/theme/use-app-theme';
import { answersMatch } from '@/lib/text';
import { CASES } from '@/features/word-forms/profile-core';

import type { ClozeOutcome } from '../../mapping';
import type { ClozeItem } from './session';
import { endingMatches } from './stem-split';

/** Pause after a correct answer so the coloring registers (T06 rhythm). */
const FEEDBACK_DELAY_MS = 900;

interface ClozeViewProps {
  entry: ClozeItem;
  onDone: (outcome: ClozeOutcome) => void;
}

/**
 * Cloze (design §7.3 mode 3): the sentence renders with the target token
 * blanked; tiles or typed input fill it. Wrong answers and reveals pause on
 * an explicit Continue (there's a correction to read); correct answers
 * advance themselves. Remounted per item (key on the session screen).
 */
export function ClozeView({ entry, onDone }: ClozeViewProps) {
  const { tokens: theme } = useAppTheme();
  const target = entry.source.tokens[entry.source.targetIndex]!;
  const ending = entry.variant === 'ending' ? entry.ending : undefined;
  const caseLabel = ending ? (CASES[ending.language][ending.caseIndex] ?? '') : '';
  // Ending variant: the blank is only the ending; the stem renders inline in the sentence.
  const stemShown = ending ? ending.stem : '';
  const expectedShown = ending ? ending.endings[0]! : target.text;

  const [answered, setAnswered] = React.useState<null | { text: string; correct: boolean }>(null);
  const [revealed, setRevealed] = React.useState(false);
  const [hintsUsed, setHintsUsed] = React.useState(0);
  const [typed, setTyped] = React.useState('');
  const [selectedTile, setSelectedTile] = React.useState<string | null>(null);

  const shownAtRef = React.useRef(0);
  React.useEffect(() => {
    shownAtRef.current = Date.now();
    if (ending) track('cloze_ending_variant_served', { pos: ending.pos, case: ending.caseSlug });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount (the view is keyed per item)
  }, []);

  const finish = React.useCallback(
    (correct: boolean, wasRevealed: boolean, delayMs?: number) => {
      const outcome: ClozeOutcome = {
        variant: entry.variant,
        correct,
        hintsUsed,
        revealed: wasRevealed,
        durationMs: Date.now() - shownAtRef.current,
      };
      if (delayMs) setTimeout(() => onDone(outcome), delayMs);
      else onDone(outcome);
    },
    [entry.variant, hintsUsed, onDone],
  );

  const answer = React.useCallback(
    (text: string, viaTile: string | null) => {
      if (answered || revealed) return;
      const correct = ending
        ? endingMatches(ending, text, ending.language)
        : answersMatch(target.text, text);
      Vibration.vibrate(correct ? 8 : 24);
      setAnswered({ text, correct });
      if (viaTile != null) setSelectedTile(viaTile);
      if (correct) finish(true, false, FEEDBACK_DELAY_MS);
      // wrong → explicit Continue below
    },
    [answered, revealed, target.text, finish],
  );

  const takeHint = React.useCallback(() => {
    if (answered || revealed) return;
    const next = hintsUsed + 1;
    setHintsUsed(next);
    track('cloze_hint_used', { step: next });
    if (ending && next === 1) track('cloze_ending_hint_used', { case: ending.caseSlug });
  }, [answered, revealed, hintsUsed, ending]);

  const reveal = React.useCallback(() => {
    if (answered || revealed) return;
    setRevealed(true);
    Vibration.vibrate(24);
    track('cloze_hint_used', { step: 'reveal' });
  }, [answered, revealed]);

  // What the blank shows right now.
  const blankPlaceholder = ending ? '_'.repeat(Math.max(2, ending.blankLength)) : '______';
  const blankText = answered
    ? ending
      ? stripStem(answered.text, ending.stem)
      : answered.text
    : revealed
      ? expectedShown
      : blankPlaceholder;
  const blankColor = answered
    ? answered.correct
      ? theme.success
      : theme.danger
    : revealed
      ? theme.danger
      : theme.accent;

  const showContinue = (answered && !answered.correct) || revealed;

  return (
    <View className="flex-1 px-4 pt-6">
      <Text variant="caption" className="text-center uppercase tracking-wider">
        {ending
          ? 'Допиши закінчення'
          : `Cloze · ${entry.variant === 'tiles' ? 'pick the missing word' : 'type the missing word'}`}
      </Text>

      <View className="mt-4 min-h-36 justify-center rounded-2xl border border-border bg-surface px-5 py-7">
        <RNText className="font-reading text-2xl leading-10 text-text">
          {entry.source.tokens.map((t, i) => {
            const prefix = t.spaceBefore ? ' ' : '';
            if (i === entry.source.targetIndex) {
              return (
                <RNText key={i}>
                  {prefix}
                  {stemShown}
                  <RNText style={{ color: blankColor, fontWeight: '700' }}>{blankText}</RNText>
                </RNText>
              );
            }
            return (
              <RNText key={i}>
                {prefix}
                {t.text}
              </RNText>
            );
          })}
        </RNText>
        <Text variant="muted" className="mt-3">
          {entry.source.sentence.en}
        </Text>
      </View>

      {/* wrong answer: show what it should have been */}
      {answered && !answered.correct && (
        <Text className="mt-3 text-center">
          {ending ? 'Правильно: ' : 'Correct: '}
          <Text className="font-ui-medium text-success">
            {ending ? `${stemShown}${expectedShown}` : target.text}
          </Text>
        </Text>
      )}

      {entry.variant === 'tiles' && entry.tiles ? (
        <View className="mt-5 flex-row flex-wrap justify-center gap-2.5">
          {entry.tiles.map((tile) => {
            const isCorrectTile = answersMatch(target.text, tile);
            let frame = 'border-border bg-surface active:bg-surface-2';
            if (answered) {
              if (isCorrectTile) frame = 'border-success bg-success/15';
              else if (selectedTile === tile) frame = 'border-danger bg-danger/15';
              else frame = 'border-border bg-surface opacity-50';
            }
            return (
              <Pressable
                key={tile}
                onPress={() => answer(tile, tile)}
                disabled={!!answered}
                accessibilityRole="button"
                accessibilityLabel={`Answer: ${tile}`}
                className={`rounded-xl border px-4 py-3 ${frame}`}
              >
                <RNText className="font-reading text-lg text-text">{tile}</RNText>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View className="mt-5 gap-3">
          <TextInput
            value={typed}
            onChangeText={setTyped}
            editable={!answered && !revealed}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={ending ? 'Закінчення…' : 'Type the missing word…'}
            placeholderTextColor={theme.textMuted}
            onSubmitEditing={() => typed.trim() && answer(typed, null)}
            className="rounded-xl border border-border bg-surface px-4 py-3.5 font-reading text-xl text-text"
            accessibilityLabel={ending ? 'Закінчення' : 'Missing word'}
          />

          {/* hint ladder: first letter → lemma → reveal (each capping the rating, see mapping.ts) */}
          {hintsUsed >= 1 && !answered && !revealed && (
            <Text variant="muted" className="text-center">
              {ending
                ? hintsUsed === 1
                  ? `Підказка: ${caseHint(caseLabel)}${ending.alternation ? ' (чергування)' : ''}`
                  : `Початкова форма: «${entry.item.lemma}»`
                : hintsUsed === 1
                  ? `Starts with «${target.text.slice(0, 1).toLocaleLowerCase('uk-UA')}…»`
                  : `Dictionary form: «${entry.item.lemma}»`}
            </Text>
          )}

          {!answered && !revealed && (
            <View className="flex-row gap-2">
              {hintsUsed < 2 ? (
                <Pressable
                  onPress={takeHint}
                  accessibilityRole="button"
                  className="flex-1 items-center rounded-xl border border-border bg-surface-2 py-3 active:bg-border"
                >
                  <Text className="font-ui-medium">
                    {ending
                      ? hintsUsed === 0
                        ? 'Підказка: відмінок'
                        : 'Підказка: початкова форма'
                      : hintsUsed === 0
                        ? 'Hint: first letter'
                        : 'Hint: dictionary form'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={reveal}
                  accessibilityRole="button"
                  className="flex-1 items-center rounded-xl border border-danger/50 bg-danger/10 py-3 active:opacity-70"
                >
                  <Text className="font-ui-medium">Reveal</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => typed.trim() && answer(typed, null)}
                disabled={!typed.trim()}
                accessibilityRole="button"
                className={`flex-1 items-center rounded-xl py-3 ${
                  typed.trim() ? 'bg-accent active:opacity-80' : 'bg-surface-2 opacity-50'
                }`}
              >
                <Text className={`font-ui-medium ${typed.trim() ? 'text-on-accent' : ''}`}>
                  Check
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {showContinue && (
        <Pressable
          onPress={() => finish(false, revealed)}
          accessibilityRole="button"
          className="mt-4 items-center rounded-xl bg-accent py-3.5 active:opacity-80"
        >
          <Text className="font-ui-medium text-on-accent">Continue</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Typed answers may include the stem; show only the ending part in the blank. */
function stripStem(typed: string, stem: string): string {
  const t = typed.trim();
  return answersMatch(t.slice(0, stem.length), stem) && t.length > stem.length
    ? t.slice(stem.length)
    : t;
}

/** «Gen. — родовий» → «родовий відмінок». */
function caseHint(label: string): string {
  const name = label.split('—')[1]?.trim();
  return name ? `${name} відмінок` : label;
}
