import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import * as React from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { track } from '@/services/analytics';
import { useAppTheme } from '@/theme/use-app-theme';

import {
  clearPat,
  DEFAULT_REPO,
  getRepoConfig,
  getWifiOnlyAudio,
  hasPat,
  setPat,
  setRepoConfig,
  setWifiOnlyAudio,
} from './config';

/**
 * Settings → Content sync (ticket item 1, design §7.8): GitHub repo config,
 * fine-grained PAT (secure-store only — the input is write-only: the stored
 * token is never read back into the UI, never logged, never in analytics),
 * and the Wi-Fi-only-audio toggle.
 */
export function SyncSettingsSection() {
  const { tokens } = useAppTheme();

  const [owner, setOwner] = React.useState('');
  const [repo, setRepo] = React.useState('');
  const [patInput, setPatInput] = React.useState('');
  const [patConfigured, setPatConfigured] = React.useState(false);
  const [wifiOnly, setWifiOnly] = React.useState(true);
  const [savedFlash, setSavedFlash] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const config = (await getRepoConfig()) ?? DEFAULT_REPO;
      setOwner(config.owner);
      setRepo(config.repo);
      setPatConfigured(await hasPat());
      setWifiOnly(await getWifiOnlyAudio());
      setLoaded(true);
    })();
  }, []);

  const save = React.useCallback(() => {
    void (async () => {
      await setRepoConfig({ owner: owner.trim(), repo: repo.trim(), branch: 'main' });
      track('sync_config_saved', { owner: owner.trim(), repo: repo.trim() });
      const token = patInput.trim();
      if (token) {
        await setPat(token);
        setPatInput('');
        setPatConfigured(true);
        track('sync_pat_saved'); // deliberately no props — never the value
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    })();
  }, [owner, repo, patInput]);

  const removeToken = React.useCallback(() => {
    void (async () => {
      await clearPat();
      setPatConfigured(false);
      track('sync_pat_cleared');
    })();
  }, []);

  const toggleWifiOnly = React.useCallback((value: boolean) => {
    setWifiOnly(value);
    track('wifi_only_audio_toggled', { enabled: value });
    void setWifiOnlyAudio(value);
  }, []);

  if (!loaded) return null;

  return (
    <>
      <Text variant="caption" className="mb-2 mt-8 uppercase tracking-wider">
        Синхронізація контенту
      </Text>
      <View className="overflow-hidden rounded-xl border border-border bg-surface px-4 py-3.5">
        <Text variant="caption" className="mb-1 uppercase tracking-wider">
          Репозиторій GitHub
        </Text>
        <View className="mb-3 flex-row items-center gap-2">
          <TextInput
            value={owner}
            onChangeText={setOwner}
            placeholder="власник"
            placeholderTextColor={tokens.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5 font-ui text-base text-text"
            accessibilityLabel="Власник репозиторію"
          />
          <Text variant="muted">/</Text>
          <TextInput
            value={repo}
            onChangeText={setRepo}
            placeholder="репозиторій"
            placeholderTextColor={tokens.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-[1.4] rounded-xl border border-border bg-surface-2 px-3 py-2.5 font-ui text-base text-text"
            accessibilityLabel="Назва репозиторію"
          />
        </View>

        <Text variant="caption" className="mb-1 uppercase tracking-wider">
          Fine-grained токен {patConfigured ? '· налаштовано ✓' : ''}
        </Text>
        <TextInput
          value={patInput}
          onChangeText={setPatInput}
          placeholder={patConfigured ? 'Введи новий токен, щоб замінити' : 'github_pat_…'}
          placeholderTextColor={tokens.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 font-ui text-base text-text"
          accessibilityLabel="Персональний токен доступу GitHub"
        />
        <Text variant="caption" className="mt-1.5">
          Потрібен доступ Contents до репозиторію контенту — read-only для синхронізації, read-write
          для резервних копій. Зберігається в Android Keystore, ніколи — у резервних копіях чи
          логах.
        </Text>
        {patConfigured && (
          <Pressable onPress={removeToken} hitSlop={6} className="mt-2 self-start">
            <Text variant="caption" className="text-danger">
              Видалити збережений токен
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={save}
          accessibilityRole="button"
          className="mt-3 items-center rounded-xl bg-accent px-4 py-2.5 active:opacity-80"
        >
          <Text className="font-ui-medium text-text">
            {savedFlash ? 'Збережено ✓' : 'Зберегти'}
          </Text>
        </Pressable>
      </View>

      <View className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
        <View className="flex-row items-center justify-between px-4 py-3.5">
          <View className="flex-1 gap-0.5 pr-3">
            <Text className="font-ui-medium">Аудіо лише через Wi-Fi</Text>
            <Text variant="caption">
              Файли озвучення чекають на Wi-Fi; історії та розмітка синхронізуються завжди
            </Text>
          </View>
          <Switch
            value={wifiOnly}
            onValueChange={toggleWifiOnly}
            trackColor={{ false: tokens.surface2, true: tokens.accent }}
            thumbColor={tokens.text}
            accessibilityLabel="Аудіо лише через Wi-Fi"
          />
        </View>
        <Link href="/packs" asChild>
          <Pressable className="flex-row items-center justify-between border-t border-border px-4 py-3.5 active:bg-surface-2">
            <View className="gap-0.5">
              <Text className="font-ui-medium">Встановлені пакети</Text>
              <Text variant="caption">Версії, розміри, оновлення, видалення</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tokens.textMuted} />
          </Pressable>
        </Link>
      </View>
    </>
  );
}
