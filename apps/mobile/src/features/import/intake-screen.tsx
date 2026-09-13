import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { Text } from '@/components/ui/text';
import type { ImportRequestRow } from '@/db/repositories/imports';
import { envelopeProgress, parseEnvelope } from '@/features/ai/import-annotate-core';
import { pumpImportAnnotateQueue, useImportAnnotateQueue } from '@/features/ai/import-annotate';
import { track } from '@/services/analytics';
import { useAppTheme } from '@/theme/use-app-theme';

import { useImportRequests } from './hooks';
import { IMPORT_CHAR_CAP, normalizeIntakeText, planImportSplit, suggestTitle } from './import-core';
import { createImportRequests, removeImportRequest } from './import-service';
import { useImportIntakeStore } from './intake-store';

/**
 * «Імпорт» intake (T28, design V2 §4.1): paste or share Ukrainian text →
 * durable import request(s). Over-cap input splits at sentence boundaries
 * (shown before saving). Requests queue offline — the AI annotation step
 * (T29) runs when online; this session's dev-only stub path lives on the
 * Developer screen.
 */
export function ImportIntakeScreen() {
  const { tokens } = useAppTheme();
  const requests = useImportRequests();

  // One-shot share hand-off, consumed by lazy init: the gate stashes the
  // text and pushes this route (a share while an intake is already open
  // pushes a fresh instance, so the first render here always sees it —
  // no state-copying effects needed, per the strict hooks lint).
  const [text, setText] = React.useState(() => {
    const shared = useImportIntakeStore.getState().sharedText;
    if (shared != null) useImportIntakeStore.getState().setSharedText(null);
    return shared ?? '';
  });
  const [title, setTitle] = React.useState('');
  const [titleTouched, setTitleTouched] = React.useState(false);
  const [sourceLabel, setSourceLabel] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      track('import_intake_opened');
    }, []),
  );

  const effectiveTitle = React.useMemo(() => {
    if (titleTouched && title.trim()) return title;
    return text.trim() ? suggestTitle(normalizeIntakeText(text)) : '';
  }, [text, title, titleTouched]);

  const normalized = React.useMemo(() => normalizeIntakeText(text), [text]);
  const parts = React.useMemo(() => (normalized ? planImportSplit(normalized) : []), [normalized]);
  const overCap = normalized.length > IMPORT_CHAR_CAP;
  const canSave = normalized.length > 0 && effectiveTitle.trim().length > 0 && !saving;

  const onSave = React.useCallback(() => {
    if (!canSave) return;
    setSaving(true);
    void (async () => {
      try {
        const rows = await createImportRequests({
          text: normalized,
          title: effectiveTitle.trim(),
          ...(sourceLabel.trim() ? { sourceLabel: sourceLabel.trim() } : {}),
        });
        setText('');
        setTitle('');
        setTitleTouched(false);
        setSourceLabel('');
        // Kick the worker so an online save annotates immediately (the
        // T15/T16 requestFeedback pattern); offline it quietly no-ops and
        // the connectivity listener picks the rows up later.
        void pumpImportAnnotateQueue();
        Alert.alert(
          rows.length > 1 ? `Збережено: ${rows.length} ${partsLabel(rows.length)}` : 'Збережено',
          rows.length > 1
            ? `The text was split at sentence boundaries into ${rows.length} requests, each within the ${IMPORT_CHAR_CAP}-character cap.`
            : 'The import request is queued. Annotation runs when online.',
        );
      } catch (err) {
        Alert.alert('Не вийшло', err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setSaving(false);
      }
    })();
  }, [canSave, normalized, effectiveTitle, sourceLabel]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-12 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="caption" className="mb-1 uppercase tracking-wider">
          Український текст
        </Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Встав текст — повідомлення, абзац статті, слова пісні…"
          placeholderTextColor={tokens.textMuted}
          multiline
          textAlignVertical="top"
          autoCorrect={false}
          className="min-h-44 rounded-xl border border-border bg-surface-2 px-3 py-2.5 font-reading text-base text-text"
          accessibilityLabel="Ukrainian text to import"
        />
        <View className="mt-1 flex-row items-center justify-between">
          <Text variant="caption" className={overCap ? 'text-accent' : ''}>
            {normalized.length} / {IMPORT_CHAR_CAP}
          </Text>
          {overCap && (
            <Text variant="caption" className="text-accent">
              Буде розділено: {parts.length} {partsLabel(parts.length)}
            </Text>
          )}
        </View>

        <Text variant="caption" className="mb-1 mt-4 uppercase tracking-wider">
          Назва
        </Text>
        <TextInput
          value={titleTouched ? title : effectiveTitle}
          onChangeText={(v) => {
            setTitle(v);
            setTitleTouched(true);
          }}
          placeholder="Назва імпорту"
          placeholderTextColor={tokens.textMuted}
          autoCorrect={false}
          className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 font-ui text-base text-text"
          accessibilityLabel="Import title"
        />

        <Text variant="caption" className="mb-1 mt-4 uppercase tracking-wider">
          Джерело (optional)
        </Text>
        <TextInput
          value={sourceLabel}
          onChangeText={setSourceLabel}
          placeholder="e.g. Telegram — Аліна"
          placeholderTextColor={tokens.textMuted}
          autoCorrect={false}
          className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 font-ui text-base text-text"
          accessibilityLabel="Source label"
        />

        <Pressable
          onPress={onSave}
          disabled={!canSave}
          accessibilityRole="button"
          className={`mt-6 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3 ${
            canSave ? 'bg-accent active:opacity-80' : 'bg-surface-2'
          }`}
        >
          {saving ? (
            <ActivityIndicator size="small" color={tokens.text} />
          ) : (
            <Ionicons name="download-outline" size={18} color={tokens.text} />
          )}
          <Text className="font-ui-medium">
            {overCap ? `Імпортувати ${parts.length} ${partsLabel(parts.length)}` : 'Імпортувати'}
          </Text>
        </Pressable>
        <Text variant="caption" className="mt-2 text-center">
          Requests are saved offline and annotated when online.
        </Text>

        <RequestsList requests={requests.data ?? []} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Ukrainian plural agreement for «частина»: 1 частина · 2–4 частини · 5+ частин. */
function partsLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'частина';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'частини';
  return 'частин';
}

const STATUS_LABELS: Record<ImportRequestRow['status'], string> = {
  draft: 'Чернетка',
  queued: 'У черзі',
  annotated: 'Чекає на перевірку',
  committed: 'Імпортовано',
  failed: 'Помилка',
};

function RequestsList({ requests }: { requests: ImportRequestRow[] }) {
  const { tokens } = useAppTheme();
  const router = useRouter();
  const phases = useImportAnnotateQueue((s) => s.byRequest);
  if (requests.length === 0) return null;

  const confirmRemove = (row: ImportRequestRow) => {
    Alert.alert('Видалити запит?', `«${row.title}» will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void removeImportRequest(row.id),
      },
    ]);
  };

  return (
    <View className="mt-8">
      <Text variant="caption" className="mb-2 uppercase tracking-wider">
        Запити
      </Text>
      <View className="overflow-hidden rounded-xl border border-border bg-surface">
        {requests.map((row, i) => {
          const phase = phases[row.id];
          const env = parseEnvelope(row.annotationJson);
          const progress = env ? envelopeProgress(env) : null;
          const reviewable = row.status === 'annotated';
          // Sending: live N/M line. Queued w/ partial progress: resume info.
          const statusLine =
            phase?.phase === 'sending'
              ? `Анотація… ${phase.done ?? 0}/${phase.total ?? progress?.total ?? '?'}`
              : phase?.phase === 'error'
                ? (phase.message ?? 'Error')
                : row.status === 'queued' && progress && progress.done > 0
                  ? `${STATUS_LABELS[row.status]} · ${progress.done}/${progress.total}`
                  : reviewable && progress
                    ? `${STATUS_LABELS[row.status]} · ${progress.total} реч.${progress.flagged > 0 ? ` · ${progress.flagged} ⚑` : ''}`
                    : STATUS_LABELS[row.status];
          const openable = reviewable || row.status === 'committed';
          return (
            <Pressable
              key={row.id}
              // No `disabled` here: a disabled parent Pressable swallows the
              // nested retry/trash taps on Android (device-found). No-op press
              // instead for rows that aren't openable.
              onPress={openable ? () => router.push(`/import-review/${row.id}`) : undefined}
              accessibilityRole={reviewable ? 'button' : undefined}
              className={`flex-row items-center gap-3 px-4 py-3 ${i === 0 ? '' : 'border-t border-border'} ${
                openable ? 'active:bg-surface-2' : ''
              }`}
            >
              {phase?.phase === 'sending' && (
                <ActivityIndicator size="small" color={tokens.accent} />
              )}
              <View className="flex-1 gap-0.5">
                <Text className="font-ui-medium" numberOfLines={1}>
                  {row.title}
                </Text>
                <Text
                  variant="caption"
                  numberOfLines={1}
                  className={phase?.phase === 'error' ? 'text-danger' : ''}
                >
                  {statusLine} · {row.text.length} chars ·{' '}
                  {new Date(row.createdAt).toLocaleDateString()}
                </Text>
              </View>
              {reviewable && (
                <View className="flex-row items-center gap-1">
                  <Text variant="caption" className="text-accent">
                    Перевірити
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={tokens.accent} />
                </View>
              )}
              {phase?.phase === 'error' && (
                <Pressable
                  onPress={() => void pumpImportAnnotateQueue()}
                  hitSlop={8}
                  accessibilityLabel={`Retry annotation for ${row.title}`}
                >
                  <Ionicons name="refresh-outline" size={18} color={tokens.accent} />
                </Pressable>
              )}
              {row.status !== 'committed' && phase?.phase !== 'sending' && (
                <Pressable
                  onPress={() => confirmRemove(row)}
                  hitSlop={8}
                  accessibilityLabel={`Remove import request ${row.title}`}
                >
                  <Ionicons name="trash-outline" size={18} color={tokens.textMuted} />
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
