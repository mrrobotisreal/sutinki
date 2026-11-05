/**
 * Ukrainian plural primitive (ADR-0010 Decision 2): the single place every
 * count-noun agreement goes through. `forms` = [one, few, many], e.g.
 * «речення · речення · речень». 1/21/31… (not 11) -> one; 2-4/22-24… (not
 * 12-14) -> few; everything else -> many.
 */
export type PluralForms = readonly [one: string, few: string, many: string];

export function pluralUk(n: number, forms: PluralForms): string {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
