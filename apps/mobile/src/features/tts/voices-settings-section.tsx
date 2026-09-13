import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useAppTheme } from '@/theme/use-app-theme';

import { formatBytes, PIPER_VOICES, SYSTEM_VOICE_ID, type PiperVoice } from './catalog';
import { deleteVoice, installVoice } from './manager';
import { setSelectedVoice } from './service';
import { useTtsStore } from './store';

/**
 * Settings → Голоси (T11 / UT05, design §7.8): the Piper voice manager.
 * Install/delete voices with progress + storage accounting; pick the active
 * voice — or, for a multi-speaker voice, the active speaker (each speaker is
 * its own radio row under the one download) — or the system TTS fallback.
 * Follows the settings list pattern (UI_DESIGN §4 / T07's sync section).
 */
export function VoicesSettingsSection() {
  const { tokens } = useAppTheme();
  const { selectedVoiceId, selectedSid, installed, downloads, downloadErrors } = useTtsStore();

  const totalBytes = Object.values(installed).reduce((sum, v) => sum + v.bytes, 0);

  const select = React.useCallback((voiceId: string, sid = 0) => {
    void setSelectedVoice(voiceId, sid);
  }, []);

  const download = React.useCallback((voice: PiperVoice) => {
    void installVoice(voice.id)
      .then(() => {
        // First installed voice: switch to it right away — the user
        // downloaded it to hear it, not to configure it twice.
        if (useTtsStore.getState().selectedVoiceId === SYSTEM_VOICE_ID) {
          void setSelectedVoice(voice.id, 0);
        }
      })
      .catch(() => {
        // Error already recorded in the store; the row renders it.
      });
  }, []);

  const confirmDelete = React.useCallback((voice: PiperVoice) => {
    const bytes = useTtsStore.getState().installed[voice.id]?.bytes ?? 0;
    Alert.alert('Видалити голос?', `${voice.displayName} звільнить ${formatBytes(bytes)}.`, [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteVoice(voice.id);
            if (useTtsStore.getState().selectedVoiceId === voice.id) {
              await setSelectedVoice(SYSTEM_VOICE_ID);
            }
          })();
        },
      },
    ]);
  }, []);

  const radio = (selected: boolean) => (
    <Ionicons
      name={selected ? 'radio-button-on' : 'radio-button-off'}
      size={20}
      color={selected ? tokens.accent : tokens.textMuted}
    />
  );

  return (
    <>
      <Text variant="caption" className="mb-2 mt-8 uppercase tracking-wider">
        Голоси
      </Text>
      <View className="overflow-hidden rounded-xl border border-border bg-surface">
        {/* System TTS — always present, the design §11 safety net. */}
        <Pressable
          onPress={() => select(SYSTEM_VOICE_ID)}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedVoiceId === SYSTEM_VOICE_ID }}
          className="flex-row items-center justify-between px-4 py-3.5 active:bg-surface-2"
        >
          <View className="flex-1 gap-0.5 pr-3">
            <Text className="font-ui-medium">Системний голос</Text>
            <Text variant="caption">Український голос Android — без завантаження</Text>
          </View>
          {radio(selectedVoiceId === SYSTEM_VOICE_ID)}
        </Pressable>

        {PIPER_VOICES.map((voice) => {
          const install = installed[voice.id];
          const dl = downloads[voice.id];
          const error = downloadErrors[voice.id];
          const isSelected = selectedVoiceId === voice.id;
          const multiSpeaker = voice.speakers.length > 1;

          return (
            <View key={voice.id} className="border-t border-border">
              <Pressable
                onPress={install && !multiSpeaker ? () => select(voice.id) : undefined}
                disabled={!install || multiSpeaker}
                accessibilityRole={multiSpeaker ? 'header' : 'radio'}
                accessibilityState={{ selected: isSelected, disabled: !install }}
                className="flex-row items-center justify-between px-4 py-3.5 active:bg-surface-2"
              >
                <View className="flex-1 gap-0.5 pr-3">
                  <Text className="font-ui-medium">
                    {voice.displayName}
                    <Text variant="caption"> · Piper</Text>
                  </Text>
                  <Text variant="caption">
                    {install
                      ? `${voice.description} · ${formatBytes(install.bytes)} на пристрої`
                      : `${voice.description} · завантаження ${formatBytes(voice.archiveBytes)}`}
                  </Text>
                </View>

                {dl ? (
                  <Text variant="caption" className="text-accent">
                    {dl.phase === 'downloading'
                      ? `${Math.round(dl.progress * 100)}%`
                      : dl.phase === 'verifying'
                        ? 'Перевірка…'
                        : 'Розпакування…'}
                  </Text>
                ) : install ? (
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      onPress={() => confirmDelete(voice)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Видалити ${voice.displayName}`}
                    >
                      <Ionicons name="trash-outline" size={18} color={tokens.textMuted} />
                    </Pressable>
                    {!multiSpeaker && radio(isSelected)}
                  </View>
                ) : (
                  <Pressable
                    onPress={() => download(voice)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Завантажити ${voice.displayName}`}
                    className="flex-row items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 active:bg-border"
                  >
                    <Ionicons name="cloud-download-outline" size={16} color={tokens.accent} />
                    <Text variant="caption" className="text-accent">
                      Завантажити
                    </Text>
                  </Pressable>
                )}
              </Pressable>

              {/* Multi-speaker voice: one radio row per speaker (UT05). */}
              {install &&
                multiSpeaker &&
                voice.speakers.map((speaker) => {
                  const speakerSelected = isSelected && selectedSid === speaker.sid;
                  return (
                    <Pressable
                      key={speaker.sid}
                      onPress={() => select(voice.id, speaker.sid)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: speakerSelected }}
                      accessibilityLabel={`${speaker.displayName} — ${voice.displayName}`}
                      className="flex-row items-center justify-between py-3 pl-10 pr-4 active:bg-surface-2"
                    >
                      <View className="flex-1 gap-0.5 pr-3">
                        <Text>{speaker.displayName}</Text>
                        <Text variant="caption">{speaker.description}</Text>
                      </View>
                      {radio(speakerSelected)}
                    </Pressable>
                  );
                })}

              {dl && dl.phase === 'downloading' && (
                <View className="mx-4 mb-3 h-1 overflow-hidden rounded-full bg-surface-2">
                  <View
                    className="h-1 rounded-full bg-accent"
                    style={{ width: `${Math.max(2, Math.round(dl.progress * 100))}%` }}
                  />
                </View>
              )}
              {error && !dl && (
                <Text variant="caption" className="mx-4 mb-3 text-danger">
                  {error} — натисни «Завантажити», щоб повторити
                </Text>
              )}
            </View>
          );
        })}
      </View>
      <Text variant="caption" className="mt-2 px-1">
        {totalBytes > 0
          ? `Голоси займають ${formatBytes(totalBytes)}. Завантажені голоси працюють без інтернету.`
          : 'Голоси Piper працюють без інтернету після завантаження (26–80 МБ).'}
      </Text>
    </>
  );
}
