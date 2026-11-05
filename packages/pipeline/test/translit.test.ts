import { describe, expect, it } from 'vitest';
import {
  RUSSIAN_ONLY_LETTERS,
  TRANSLIT_MAX_CANDIDATES,
  mergeTranslit,
  translitFor,
  transliterate,
} from '../src/translit.ts';

/**
 * The 30 Appendix B seeds of `docs/design/SCENARIO_SCRIPTS_BATCH_1.md`
 * (workspace root), copied verbatim: each English word must yield AT LEAST
 * ONE of its expected Cyrillic candidates. The candidates are what the
 * Russian zipformer tends to emit for English; the T59 benchmark refines them.
 */
const SEEDS: readonly [en: string, expected: readonly string[]][] = [
  ['stomach', ['стомак', 'стомэк']],
  ['headache', ['хэдэйк', 'хедейк']],
  ['fever', ['фивер', 'фива']],
  ['throat', ['троут', 'фроут', 'срот']],
  ['wallet', ['уолет', 'валет', 'воллет']],
  ['passport', ['паспорт', 'пэспорт']],
  ['receipt', ['ресит', 'рисит']],
  ['withdraw', ['уиздро', 'визро', 'видро']],
  ['exchange', ['эксчейндж', 'иксчейндж']],
  ['account', ['акаунт', 'эккаунт']],
  ['diesel', ['дизел', 'дизль']],
  ['engine', ['энджин', 'инджин']],
  ['tire', ['тайр', 'тайер']],
  ['bridge', ['бридж']],
  ['church', ['чёрч', 'чорч']],
  ['hotel', ['хотел', 'хоутел']],
  ['police', ['полис', 'палис']],
  ['witness', ['уитнес', 'витнес']],
  ['hoodie', ['худи']],
  ['beard', ['бирд', 'биард']],
  ['glasses', ['гласес', 'гласиз']],
  ['matches', ['мэтчез', 'матчес']],
  ['lighter', ['лайтер']],
  ['shift', ['шифт']],
  ['boss', ['бос', 'босс']],
  ['nightmare', ['найтмэр', 'найтмеа']],
  ['whisper', ['уиспер', 'виспер']],
  ['basement', ['бэйсмент', 'бейсмент']],
  ['guest', ['гест']],
  ['microphone', ['майкрофон', 'микрофон']],
];

describe('translit — Appendix B seeds', () => {
  it('has all 30 seeds', () => {
    expect(SEEDS).toHaveLength(30);
  });

  for (const [en, expected] of SEEDS) {
    it(`${en} → one of ${expected.join(' / ')}`, () => {
      const got = transliterate(en);
      const hit = expected.filter((e) => got.includes(e));
      expect(hit, `got: ${got.join(', ')}`).not.toHaveLength(0);
    });
  }
});

describe('translit — mechanics', () => {
  it('is deterministic, primary-first, deduped, NFC and capped', () => {
    const a = transliterate('exchange');
    expect(a).toEqual(transliterate('Exchange'));
    expect(new Set(a).size).toBe(a.length);
    expect(a.length).toBeLessThanOrEqual(TRANSLIT_MAX_CANDIDATES);
    for (const c of a) expect(c).toBe(c.normalize('NFC'));
    expect(a[0]).toBe('эксчэйндж');
    expect(a).toContain('эксчейндж');
  });

  it('handles phrases word by word and strips non-letters', () => {
    const got = transliterate('gas station!');
    expect(got[0]!.split(' ')).toHaveLength(2);
    expect(got[0]).toMatch(/^гас ст/);
    expect(transliterate('')).toEqual([]);
    expect(transliterate('123')).toEqual([]);
  });

  it('drops the silent final e and keeps a pronounced one', () => {
    expect(transliterate('hotel')).toContain('хотел');
    expect(transliterate('police')).toContain('полис');
    expect(transliterate('guest')).toContain('гест');
  });

  it('mergeTranslit puts hand extras first, then generated, deduped case-insensitively', () => {
    expect(mergeTranslit(['стомак', 'стомэк'], ['Стомик', 'стомак ', ''])).toEqual([
      'стомик',
      'стомак',
      'стомэк',
    ]);
  });
});

describe('translit — Ukrainian table (UT14)', () => {
  // Appendix B re-expressed for the NeMo-uk transcript conventions (ticket decision 2).
  const SEEDS_UK: readonly [en: string, expected: readonly string[]][] = [
    ['stomach', ['стомак', 'стамак']],
    ['headache', ['гедейк', 'хедейк']],
    ['fever', ['фівер', 'фіва']],
    ['throat', ['троут', 'зроут', 'срот']],
    ['wallet', ['валет', 'воллет', 'уолет']],
    ['passport', ['паспорт', 'песпорт']],
    ['receipt', ['рісіт', 'ресіт']],
    ['withdraw', ['віздро', 'вітдро', 'видро']],
    ['exchange', ['ексчейндж', 'іксчейндж']],
    ['account', ['акаунт', 'екаунт']],
    ['diesel', ['дізел', 'дізіл']],
    ['engine', ['енджін', 'інджін', 'енджин']],
    ['tire', ['тайр', 'тайер']],
    ['bridge', ['брідж', 'бридж']],
    ['church', ['черч', 'чорч']],
    ['hotel', ['готел', 'хотел', 'хоутел']],
    ['police', ['поліс', 'палис', 'полис']],
    ['witness', ['вітнес', 'вітнис']],
    ['hoodie', ['гуді', 'худі']],
    ['beard', ['бірд', 'біард']],
    ['glasses', ['гласес', 'гласіз']],
    ['matches', ['мечез', 'мачес', 'мечес']],
    ['lighter', ['лайтер']],
    ['shift', ['шіфт', 'шифт']],
    ['boss', ['бос', 'босс']],
    ['nightmare', ['найтмер', 'найтмеа']],
    ['whisper', ['віспер', 'уіспер']],
    ['basement', ['бейсмент', 'бесмент']],
    ['guest', ['гест']],
    ['microphone', ['майкрофон', 'мікрофон']],
  ];

  it('has 30 seeds', () => expect(SEEDS_UK).toHaveLength(30));

  for (const [en, expected] of SEEDS_UK) {
    it(`uk: ${en} → one of ${expected.join(' / ')}`, () => {
      const got = transliterate(en, 'uk');
      expect(
        expected.filter((e) => got.includes(e)),
        `got: ${got.join(', ')}`,
      ).not.toHaveLength(0);
    });
  }

  it('no uk candidate ever contains ы э ё ъ (forbidden-letter guard)', () => {
    const corpus = [
      ...SEEDS_UK.map(([en]) => en),
      'gas station',
      'coffee',
      'pharmacy',
      'appointment',
      'prescription',
      'sandwich',
      'ticket',
      'tomorrow',
      'yes',
      'happy',
      'my',
      'type',
      'eye',
      'early',
      'echo',
      'enough',
      'apple',
      'yellow',
      'cheese',
      'quiet',
      'young',
      'bye',
      'every',
      'excuse',
      'extra',
      'ankle',
      'island',
    ];
    for (const en of corpus) {
      for (const c of transliterate(en, 'uk')) {
        expect(RUSSIAN_ONLY_LETTERS.test(c), `${en} → ${c}`).toBe(false);
      }
    }
  });

  it('is capped, deduped, NFC and deterministic; translitFor selects the table', () => {
    const a = transliterate('exchange', 'uk');
    expect(a.length).toBeLessThanOrEqual(TRANSLIT_MAX_CANDIDATES);
    expect(new Set(a).size).toBe(a.length);
    for (const c of a) expect(c).toBe(c.normalize('NFC'));
    expect(translitFor('uk')('exchange')).toEqual(a);
    expect(translitFor('ru')('exchange')).toEqual(transliterate('exchange'));
    expect(a).not.toEqual(transliterate('exchange', 'ru'));
  });

  it('letter conventions: h→г/х, w→в/у, th, sh, ch, j, ee→і, oo→у, ou→ау, ph, x, qu, tion', () => {
    const has = (en: string, c: string) => expect(transliterate(en, 'uk'), en).toContain(c);
    has('hat', 'гет');
    has('hat', 'хет');
    has('win', 'він');
    has('win', 'уін');
    has('think', 'тінк');
    has('shop', 'шоп');
    has('chat', 'чет');
    has('jam', 'джем');
    has('feet', 'фіт');
    has('moon', 'мун');
    has('house', 'гауз');
    has('phone', 'фоун');
    has('box', 'бокс');
    has('quick', 'квік');
    has('station', 'стейшн');
  });

  it('doubled letters collapse; final y → і / ай; Ukrainian і, never Russian и-only', () => {
    expect(transliterate('coffee', 'uk')).toContain('кофі');
    expect(transliterate('happy', 'uk')).toContain('гепі');
    expect(transliterate('my', 'uk')).toContain('май');
    expect(transliterate('boss', 'uk')).toContain('бос');
  });

  it('the two tables differ (ru keeps its Russian letters, uk never)', () => {
    expect(transliterate('hotel', 'ru').some((c) => RUSSIAN_ONLY_LETTERS.test(c))).toBe(false);
    expect(transliterate('exchange', 'ru').some((c) => RUSSIAN_ONLY_LETTERS.test(c))).toBe(true);
    expect(transliterate('exchange', 'uk').some((c) => RUSSIAN_ONLY_LETTERS.test(c))).toBe(false);
  });
});
