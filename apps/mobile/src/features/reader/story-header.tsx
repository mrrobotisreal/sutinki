import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { Image, Linking, Pressable, View } from 'react-native';

import { CategoryBadge } from '@/components/category-badge';
import { LevelChip, type CefrLevel } from '@/components/level-chip';
import { Text } from '@/components/ui/text';
import { pluralUk } from '@/lib/uk-plural';
import { useAppTheme } from '@/theme/use-app-theme';

import { formatSourceLine, type StorySourceProps } from './source-line';

const grainTexture = require('../../../assets/textures/grain.png');

interface StoryHeaderProps {
  titleUk: string;
  titleEn: string;
  level: CefrLevel;
  packTitleUk: string;
  sentenceCount: number;
  finished: boolean;
  /** M14 (T46): from the reader's one `classifyPack()` per mount. */
  category: string;
  genre: string | null;
  /** Dek / episode tagline / lesson subtitle — italic under the title when present. */
  subtitleUk?: string | null;
  /** Provenance line; pressable only when `url` exists. */
  source?: StorySourceProps | null;
  /** Fired after a successful `Linking.openURL` on the source line. */
  onSourceLinkOpened?: () => void;
}

/**
 * Atmospheric story header (design §10 / UI_DESIGN §7 `StoryHeader`):
 * a surface-toned block with static grain tile + gradient vignette. All
 * layers are static images/gradients — nothing computed per frame, so
 * scroll cost is a one-time raster (T22 perf note in the ticket).
 *
 * M14 (T46, LIBRARY_CATEGORIES §5): top row `LevelChip · CategoryBadge ·
 * packTitleUk`; an italic subtitle under the title; and a source line
 * (`name · date · author`, missing parts omitted) that opens the original
 * URL when one exists. Fiction headers without subtitle/source render the
 * pre-M14 layout plus the badge — nothing else moves.
 */
export function StoryHeader({
  titleUk,
  titleEn,
  level,
  packTitleUk,
  sentenceCount,
  finished,
  category,
  genre,
  subtitleUk,
  source,
  onSourceLinkOpened,
}: StoryHeaderProps) {
  const { tokens, scheme } = useAppTheme();
  const sourceLine = source ? formatSourceLine(source) : null;
  const sourceUrl = source?.url ?? null;

  const openSource = React.useCallback(() => {
    if (!sourceUrl) return;
    // The demo fixture points at example.invalid — the browser landing on
    // an error page is the expected outcome; the intent is the open. Any
    // failure (no handler, rejected) is swallowed: never a crash here.
    void Linking.canOpenURL(sourceUrl)
      .then((ok) => (ok ? Linking.openURL(sourceUrl) : undefined))
      .then(() => onSourceLinkOpened?.())
      .catch(() => {});
  }, [sourceUrl, onSourceLinkOpened]);

  return (
    <View className="mb-4 overflow-hidden bg-surface-2">
      {/* base wash: a barely-there ember glow rising from the bottom edge */}
      <LinearGradient
        colors={[`${tokens.bg}00`, `${tokens.accent}14`]}
        style={{ position: 'absolute', inset: 0 }}
      />
      {/* film grain — tiled static texture, dimmer on light paper */}
      <Image
        source={grainTexture}
        resizeMode="repeat"
        style={{ position: 'absolute', inset: 0, opacity: scheme === 'dark' ? 0.5 : 0.28 }}
        accessibilityElementsHidden
      />
      {/* vignette: dark falloff from the top, fade into the page below */}
      <LinearGradient
        colors={[`${tokens.bg}CC`, `${tokens.bg}00`, `${tokens.bg}00`, tokens.bg]}
        locations={[0, 0.35, 0.72, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />

      <View className="px-5 pb-8 pt-20">
        <View className="mb-3 flex-row items-center gap-2">
          <LevelChip level={level} />
          <CategoryBadge category={category} genre={genre} size="sm" />
          <Text variant="caption">{packTitleUk}</Text>
        </View>
        <Text className="font-reading-bold text-2xl leading-10 text-text">{titleUk}</Text>
        {subtitleUk ? (
          <Text variant="muted" className="mt-1 font-reading-italic text-lg leading-7">
            {subtitleUk}
          </Text>
        ) : null}
        <Text variant="muted" className="mt-1 font-reading-italic">
          {titleEn}
        </Text>
        {sourceLine ? (
          sourceUrl ? (
            <Pressable
              onPress={openSource}
              hitSlop={6}
              accessibilityRole="link"
              accessibilityLabel={`Источник: ${sourceLine}`}
              className="mt-3 flex-row items-center gap-1 self-start active:opacity-70"
            >
              <Text variant="caption">{sourceLine}</Text>
              <Ionicons name="open-outline" size={12} color={tokens.textMuted} />
            </Pressable>
          ) : (
            <Text variant="caption" className="mt-3">
              {sourceLine}
            </Text>
          )
        ) : null}
        <Text variant="caption" className={sourceLine ? 'mt-1' : 'mt-4'}>
          {sentenceCount} {pluralUk(sentenceCount, ['речення', 'речення', 'речень'])}
          {finished ? ' · прочитано ✓' : ''}
        </Text>
      </View>
    </View>
  );
}
