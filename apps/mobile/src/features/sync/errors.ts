/**
 * Typed sync failures (T07). Every code maps to a plain-language message —
 * design §6 states rule: errors are recoverable in place, never dead ends.
 * Messages must never include the PAT; they may include repo/path/status.
 */
export type SyncErrorCode =
  | 'not-configured'
  | 'offline'
  | 'auth'
  | 'not-found'
  | 'rate-limited'
  | 'http'
  | 'network'
  | 'sha256-mismatch'
  | 'invalid-manifest'
  | 'invalid-pack';

export class SyncError extends Error {
  readonly code: SyncErrorCode;
  readonly path?: string;
  readonly status?: number;

  constructor(code: SyncErrorCode, message: string, opts?: { path?: string; status?: number }) {
    super(message);
    this.name = 'SyncError';
    this.code = code;
    this.path = opts?.path;
    this.status = opts?.status;
  }
}

/** User-facing one-liner for any error a sync run can surface. */
export function friendlySyncMessage(err: unknown): string {
  if (err instanceof SyncError) {
    switch (err.code) {
      case 'not-configured':
        return 'Синхронізацію ще не налаштовано — додай репозиторій і токен у Налаштуваннях.';
      case 'offline':
        return 'Немає з’єднання — синхронізація повториться, коли з’явиться мережа.';
      case 'auth':
        return 'GitHub відхилив токен. Перевір PAT у Налаштуваннях (можливо, він прострочений).';
      case 'not-found':
        return `Не знайдено на GitHub: ${err.path ?? 'файл'}. Перевір назву репозиторію і доступ токена.`;
      case 'rate-limited':
        return 'Вичерпано ліміт запитів GitHub — спробуй за кілька хвилин.';
      case 'sha256-mismatch':
        return `Завантажений файл не пройшов перевірку (${err.path ?? 'файл'}) — пакет не встановлено.`;
      case 'invalid-manifest':
        return 'manifest.json у репозиторії контенту недійсний — опублікуй його заново з pipeline.';
      case 'invalid-pack':
        return `Завантажений pack.json недійсний (${err.path ?? 'пакет'}) — опублікуй його заново з pipeline.`;
      case 'http':
        return `Запит до GitHub не вдався (HTTP ${err.status ?? '?'}) — спробуй ще раз.`;
      case 'network':
        return 'Помилка мережі під час синхронізації — спробуй ще раз.';
    }
  }
  return err instanceof Error ? err.message : String(err);
}
