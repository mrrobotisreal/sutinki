import * as React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';

import type { ReadinessView } from './hub-model';
import { BAND_BAR_CLASS, BAND_SPAN, BAND_TEXT_CLASS } from './readiness';
import { SUBTEST_LABELS } from './topics';

/** The default threshold (B1's 70 %) when a caller passes none. */
const DEFAULT_PASS_PCT = 70;

/**
 * Readiness bars (T69 shell, T70 values): one row per section of the level with
 * the pass-threshold tick (and the amber band edge), a band-coloured fill (theme tokens: danger / track-warm /
 * success / gold) and the source line. A `null` pct renders the neutral «—»
 * placeholder. `compact` = the Library hub card's mini-bars (no source line).
 */
export function ReadinessBars({
  rows,
  compact = false,
  passPct = DEFAULT_PASS_PCT,
}: {
  rows: readonly ReadinessView[];
  compact?: boolean;
  /** The level's pass threshold, % — the tick. */
  passPct?: number;
}) {
  return (
    <View className={compact ? 'gap-1.5' : 'gap-3'}>
      {rows.map((row) => (
        <View key={row.kind} className="gap-1">
          <View className="flex-row items-center gap-2">
            <Text
              variant={compact ? 'caption' : undefined}
              className={cn(compact ? 'w-24 text-xs' : 'flex-1 font-ui-medium')}
              numberOfLines={1}
            >
              {SUBTEST_LABELS[row.kind].short}
            </Text>
            {compact && <Bar pct={row.pct} band={row.band} passPct={passPct} compact />}
            <Text
              variant="caption"
              className={cn(
                'text-right',
                compact ? 'w-9 text-xs' : 'w-12',
                row.band && BAND_TEXT_CLASS[row.band],
              )}
              accessibilityLabel={
                row.pct === null ? `${SUBTEST_LABELS[row.kind].uk}: немає даних` : undefined
              }
            >
              {row.pct === null ? '—' : `${Math.round(row.pct)} %`}
            </Text>
          </View>
          {!compact && (
            <>
              <Bar pct={row.pct} band={row.band} passPct={passPct} />
              <Text variant="caption" className="text-xs">
                {row.label}
              </Text>
            </>
          )}
        </View>
      ))}
    </View>
  );
}

function Bar({
  pct,
  band,
  passPct,
  compact = false,
}: {
  pct: number | null;
  band: ReadinessView['band'];
  passPct: number;
  compact?: boolean;
}) {
  return (
    <View
      className={cn('overflow-hidden rounded-full bg-surface-2', compact ? 'h-1.5 flex-1' : 'h-2')}
    >
      {pct !== null && (
        <View
          className={cn(
            'absolute bottom-0 left-0 top-0 rounded-full',
            band ? BAND_BAR_CLASS[band] : 'bg-text-muted',
          )}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      )}
      {[passPct - BAND_SPAN, passPct].map((t) => (
        <View
          key={t}
          className="absolute bottom-0 top-0 w-px bg-border"
          style={{ left: `${t}%` }}
        />
      ))}
    </View>
  );
}
