import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatBytes } from '@/features/tts/catalog';
import { useAppTheme } from '@/theme/use-app-theme';

import { ASR_MODEL } from './asr-catalog';
import { deleteAsrModel, installAsrModel } from './asr-manager';
import { useAsrStore } from './asr-store';

/**
 * Settings → Розпізнавання мовлення (T12 → UT06): the ASR model's
 * model-manager entry, visually identical to the voice rows (install with
 * progress, verify, delete with storage accounting) — one model, no
 * selection radio. The Ukrainian model has no content-repo mirror (> 100 MB,
 * ADR-0005), so the copy says honestly where the download comes from.
 */
export function AsrSettingsSection() {
  const { tokens } = useAppTheme();
  const { installedBytes, download, downloadError } = useAsrStore();
  const installed = installedBytes != null;

  const install = React.useCallback(() => {
    void installAsrModel().catch(() => {
      // Error already recorded in the store; the row renders it.
    });
  }, []);

  const confirmDelete = React.useCallback(() => {
    const bytes = useAsrStore.getState().installedBytes ?? 0;
    Alert.alert(
      'Видалити модель розпізнавання?',
      `Звільнить ${formatBytes(bytes)}. Без неї тренування вимови не зможе оцінювати мовлення.`,
      [
        { text: 'Скасувати', style: 'cancel' },
        { text: 'Видалити', style: 'destructive', onPress: () => void deleteAsrModel() },
      ],
    );
  }, []);

  return (
    <>
      <Text variant="caption" className="mb-2 mt-8 uppercase tracking-wider">
        Розпізнавання мовлення
      </Text>
      <View className="overflow-hidden rounded-xl border border-border bg-surface">
        <View className="flex-row items-center justify-between px-4 py-3.5">
          <View className="flex-1 gap-0.5 pr-3">
            <Text className="font-ui-medium">{ASR_MODEL.displayName}</Text>
            <Text variant="caption">
              {installed
                ? `${ASR_MODEL.description} · ${formatBytes(installedBytes)} на пристрої`
                : `${ASR_MODEL.description} · ${formatBytes(ASR_MODEL.archiveBytes)}`}
            </Text>
          </View>

          {download ? (
            <Text variant="caption" className="text-accent">
              {download.phase === 'downloading'
                ? `${Math.round(download.progress * 100)}%`
                : download.phase === 'verifying'
                  ? 'Перевірка…'
                  : 'Розпакування…'}
            </Text>
          ) : installed ? (
            <Pressable
              onPress={confirmDelete}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Видалити модель розпізнавання"
            >
              <Ionicons name="trash-outline" size={18} color={tokens.textMuted} />
            </Pressable>
          ) : (
            <Pressable
              onPress={install}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Завантажити модель розпізнавання"
              className="flex-row items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 active:bg-border"
            >
              <Ionicons name="cloud-download-outline" size={16} color={tokens.accent} />
              <Text variant="caption" className="text-accent">
                Завантажити
              </Text>
            </Pressable>
          )}
        </View>

        {download && download.phase === 'downloading' && (
          <View className="mx-4 mb-3 h-1 overflow-hidden rounded-full bg-surface-2">
            <View
              className="h-1 rounded-full bg-accent"
              style={{ width: `${Math.max(2, Math.round(download.progress * 100))}%` }}
            />
          </View>
        )}
        {downloadError && !download && (
          <Text variant="caption" className="mx-4 mb-3 text-danger">
            {downloadError} — натисни «Завантажити», щоб повторити
          </Text>
        )}
      </View>
      <Text variant="caption" className="mt-2 px-1">
        {ASR_MODEL.mirrored
          ? 'Оцінює вимову на пристрої — запис ніколи не надсилається.'
          : `Завантажується з k2-fsa (GitHub, ${formatBytes(ASR_MODEL.archiveBytes)}) — краще через Wi-Fi. Оцінює вимову на пристрої, запис ніколи не надсилається.`}
      </Text>
    </>
  );
}
