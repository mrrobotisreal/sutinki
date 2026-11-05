/**
 * Ukrainian calendar-date rendering for `story.source.publishedAt` (M14 §4.3
 * caption date). Born in T45's `features/library/library-filter.ts`; moved
 * here in T46 because the reader header's source line needs it too and a
 * feature module must not import another feature's internals. Pure; no
 * runtime dependency beyond `Intl`.
 */

// Genitive short month names — the uk-UA `month: 'short'` output ICU produces
// (ADR-0010 Decision 1; ICU appends « р.», stripped below).
const UK_MONTHS_SHORT = [
  'січ.',
  'лют.',
  'бер.',
  'квіт.',
  'трав.',
  'черв.',
  'лип.',
  'серп.',
  'вер.',
  'жовт.',
  'лист.',
  'груд.',
] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Table-driven `d MMM yyyy` — the path Hermes takes when it lacks uk-UA data. */
export function formatUkDateFallback(iso: string): string {
  const m = ISO_DATE.exec(iso);
  if (!m) return iso;
  const month = UK_MONTHS_SHORT[Number(m[2]) - 1];
  if (!month) return iso;
  return `${Number(m[3])} ${month} ${m[1]}`;
}

export type UkDatePath = 'intl' | 'fallback';

function intlUkDate(iso: string): string | null {
  const m = ISO_DATE.exec(iso);
  if (!m) return null;
  try {
    const out = new Intl.DateTimeFormat('uk-UA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    // Hermes ships limited locale data: without uk-UA it answers in English
    // or numerals — no Cyrillic means the table must take over. Full ICU
    // appends « р.» («14 вер. 2026 р.»); the caption spec is without it, so
    // both paths agree byte-for-byte.
    return /[Ѐ-ӿ]/.test(out) ? out.replace(/\s*р\.$/, '') : null;
  } catch {
    return null;
  }
}

/** Which path this runtime takes — printed on the dev-db screen for the device record. */
export function detectUkDatePath(): UkDatePath {
  return intlUkDate('2026-09-14') ? 'intl' : 'fallback';
}

/**
 * `'2026-09-14'` → `'14 вер. 2026'` (§4.3 caption date). Prefers
 * `Intl.DateTimeFormat('uk-UA')` when it produces Ukrainian output, otherwise
 * the fallback table. Malformed input is returned unchanged.
 */
export function formatUkDate(iso: string): string {
  return intlUkDate(iso) ?? formatUkDateFallback(iso);
}
