import { describe, expect, it } from 'vitest';

import { normalizeUk } from '@/db/normalize';
import {
  cardinal,
  formatAge,
  formatClock,
  formatDate,
  formatPrice,
  formatYear,
  ordinal,
  ordinalGenitive,
  pluralForm,
  toSpeech,
} from '@/lib/uk-numbers';
import { pluralUk } from '@/lib/uk-plural';

/**
 * UP06 reference corpus — written BY HAND from Ukrainian orthography (2019
 * правопис) and grammar, not generated from the implementation. The expected
 * strings below use the ASCII apostrophe for readability; `u()` folds it to
 * the module's internal U+02BC before comparing. The risky places: двісті,
 * дві тисячі / два мільйони, soft третій, apostrophe words, 1 / 2–4 / 5+ with
 * the 11–14 exception, feminine гривня / копійка, the feminine-ordinal clock.
 */
const u = (s: string): string => s.replaceAll("'", 'ʼ');

describe('cardinal — masculine (default)', () => {
  const table: [number, string][] = [
    [0, 'нуль'],
    [1, 'один'],
    [2, 'два'],
    [3, 'три'],
    [4, 'чотири'],
    [5, "п'ять"],
    [6, 'шість'],
    [7, 'сім'],
    [8, 'вісім'],
    [9, "дев'ять"],
    [10, 'десять'],
    [11, 'одинадцять'],
    [12, 'дванадцять'],
    [13, 'тринадцять'],
    [14, 'чотирнадцять'],
    [15, "п'ятнадцять"],
    [16, 'шістнадцять'],
    [17, 'сімнадцять'],
    [18, 'вісімнадцять'],
    [19, "дев'ятнадцять"],
    [20, 'двадцять'],
    [21, 'двадцять один'],
    [22, 'двадцять два'],
    [25, "двадцять п'ять"],
    [30, 'тридцять'],
    [40, 'сорок'],
    [44, 'сорок чотири'],
    [50, "п'ятдесят"],
    [60, 'шістдесят'],
    [70, 'сімдесят'],
    [80, 'вісімдесят'],
    [90, "дев'яносто"],
    [99, "дев'яносто дев'ять"],
    [100, 'сто'],
    [101, 'сто один'],
    [111, 'сто одинадцять'],
    [200, 'двісті'],
    [300, 'триста'],
    [400, 'чотириста'],
    [500, "п'ятсот"],
    [600, 'шістсот'],
    [700, 'сімсот'],
    [800, 'вісімсот'],
    [900, "дев'ятсот"],
    [512, "п'ятсот дванадцять"],
    [999, "дев'ятсот дев'яносто дев'ять"],
    [1000, 'тисяча'],
    [1001, 'тисяча один'],
    [1500, "тисяча п'ятсот"],
    [2000, 'дві тисячі'],
    [2026, 'дві тисячі двадцять шість'],
    [3004, 'три тисячі чотири'],
    [4000, 'чотири тисячі'],
    [5000, "п'ять тисяч"],
    [11000, 'одинадцять тисяч'],
    [12345, 'дванадцять тисяч триста сорок п’ять'.replace('’', "'")],
    [14000, 'чотирнадцять тисяч'],
    [21000, 'двадцять одна тисяча'],
    [22000, 'двадцять дві тисячі'],
    [25000, "двадцять п'ять тисяч"],
    [100000, 'сто тисяч'],
    [101000, 'сто одна тисяча'],
    [111111, 'сто одинадцять тисяч сто одинадцять'],
    [200000, 'двісті тисяч'],
    [999999, "дев'ятсот дев'яносто дев'ять тисяч дев'ятсот дев'яносто дев'ять"],
    [1000000, 'мільйон'],
    [2000000, 'два мільйони'],
    [5000000, "п'ять мільйонів"],
    [11000000, 'одинадцять мільйонів'],
    [21000000, 'двадцять один мільйон'],
    [2001001, 'два мільйони одна тисяча один'],
  ];
  it.each(table)('%i → %s', (n, words) => {
    expect(cardinal(n)).toBe(u(words));
  });
});

describe('cardinal — gender agreement on 1 and 2', () => {
  const table: [number, 'm' | 'f' | 'n', string][] = [
    [1, 'f', 'одна'],
    [1, 'n', 'одне'],
    [2, 'f', 'дві'],
    [2, 'n', 'два'],
    [2, 'm', 'два'],
    [21, 'f', 'двадцять одна'],
    [22, 'f', 'двадцять дві'],
    [31, 'n', 'тридцять одне'],
    [32, 'n', 'тридцять два'],
    [12, 'f', 'дванадцять'],
    [1001, 'f', 'тисяча одна'],
    [1002, 'f', 'тисяча дві'],
    [5, 'f', "п'ять"],
  ];
  it.each(table)('%i (%s) → %s', (n, g, words) => {
    expect(cardinal(n, g)).toBe(u(words));
  });
});

describe('pluralForm — 1 / 2–4 / 5+ with the 11–14 exception', () => {
  const forms = ['рік', 'роки', 'років'] as const;
  const table: [number, string][] = [
    [0, 'років'],
    [1, 'рік'],
    [2, 'роки'],
    [4, 'роки'],
    [5, 'років'],
    [11, 'років'],
    [12, 'років'],
    [13, 'років'],
    [14, 'років'],
    [15, 'років'],
    [21, 'рік'],
    [22, 'роки'],
    [25, 'років'],
    [100, 'років'],
    [101, 'рік'],
    [111, 'років'],
    [112, 'років'],
    [1004, 'роки'],
    [1011, 'років'],
  ];
  it.each(table)('%i → %s', (n, form) => {
    expect(pluralForm(n, forms)).toBe(form);
  });

  it('is the same implementation as pluralUk', () => {
    expect(pluralForm).toBe(pluralUk);
  });
});

describe('formatAge', () => {
  const table: [number, string][] = [
    [0, 'нуль років'],
    [1, 'один рік'],
    [2, 'два роки'],
    [3, 'три роки'],
    [5, "п'ять років"],
    [11, 'одинадцять років'],
    [14, 'чотирнадцять років'],
    [21, 'двадцять один рік'],
    [22, 'двадцять два роки'],
    [25, "двадцять п'ять років"],
    [36, 'тридцять шість років'],
    [44, 'сорок чотири роки'],
    [91, "дев'яносто один рік"],
    [100, 'сто років'],
    [101, 'сто один рік'],
  ];
  it.each(table)('%i → %s', (n, words) => {
    expect(formatAge(n)).toBe(u(words));
  });
});

describe('formatPrice — гривні, копійки', () => {
  const table: [number, number, string][] = [
    [1, 0, 'одна гривня'],
    [2, 0, 'дві гривні'],
    [3, 0, 'три гривні'],
    [5, 0, "п'ять гривень"],
    [11, 0, 'одинадцять гривень'],
    [12, 0, 'дванадцять гривень'],
    [14, 0, 'чотирнадцять гривень'],
    [21, 0, 'двадцять одна гривня'],
    [22, 0, 'двадцять дві гривні'],
    [42, 0, 'сорок дві гривні'],
    [100, 0, 'сто гривень'],
    [125, 0, "сто двадцять п'ять гривень"],
    [1000, 0, 'тисяча гривень'],
    [1001, 0, 'тисяча одна гривня'],
    [2000, 0, 'дві тисячі гривень'],
    [12, 50, "дванадцять гривень п'ятдесят копійок"],
    [3, 21, 'три гривні двадцять одна копійка'],
    [7, 2, 'сім гривень дві копійки'],
    [1, 1, 'одна гривня одна копійка'],
    [0, 1, 'одна копійка'],
    [0, 2, 'дві копійки'],
    [0, 11, 'одинадцять копійок'],
    [0, 99, "дев'яносто дев'ять копійок"],
    [0, 0, 'нуль гривень'],
  ];
  it.each(table)('%i.%i → %s', (whole, kop, words) => {
    expect(formatPrice(whole, kop)).toBe(u(words));
  });
});

describe('formatClock — digital reading (the drill default)', () => {
  const table: [number, number, string][] = [
    [14, 30, 'чотирнадцята тридцять'],
    [7, 0, 'сьома нуль-нуль'],
    [9, 5, "дев'ята нуль п'ять"],
    [0, 15, "нульова п'ятнадцять"],
    [0, 0, 'нульова нуль-нуль'],
    [1, 0, 'перша нуль-нуль'],
    [1, 1, 'перша нуль одна'],
    [2, 2, 'друга нуль дві'],
    [3, 15, "третя п'ятнадцять"],
    [4, 40, 'четверта сорок'],
    [8, 8, 'восьма нуль вісім'],
    [10, 10, 'десята десять'],
    [11, 20, 'одинадцята двадцять'],
    [12, 12, 'дванадцята дванадцять'],
    [12, 45, "дванадцята сорок п'ять"],
    [13, 45, "тринадцята сорок п'ять"],
    [20, 0, 'двадцята нуль-нуль'],
    [21, 21, 'двадцять перша двадцять одна'],
    [22, 2, 'двадцять друга нуль дві'],
    [23, 59, "двадцять третя п'ятдесят дев'ять"],
  ];
  it.each(table)('%i:%i → %s', (h, m, words) => {
    expect(formatClock(h, m)).toBe(u(words));
  });
});

describe('formatClock — full reading', () => {
  const table: [number, number, string][] = [
    [14, 30, 'чотирнадцята година тридцять хвилин'],
    [1, 21, 'перша година двадцять одна хвилина'],
    [2, 2, 'друга година дві хвилини'],
    [22, 0, 'двадцять друга година'],
    [0, 0, 'нульова година'],
    [11, 11, 'одинадцята година одинадцять хвилин'],
    [21, 5, "двадцять перша година п'ять хвилин"],
    [3, 44, 'третя година сорок чотири хвилини'],
    [6, 12, 'шоста година дванадцять хвилин'],
  ];
  it.each(table)('%i:%i → %s', (h, m, words) => {
    expect(formatClock(h, m, 'full')).toBe(u(words));
  });
});

describe('ordinals', () => {
  const table: [number, 'm' | 'f' | 'n', string][] = [
    [1, 'm', 'перший'],
    [1, 'n', 'перше'],
    [1, 'f', 'перша'],
    [2, 'm', 'другий'],
    [2, 'n', 'друге'],
    [2, 'f', 'друга'],
    [3, 'm', 'третій'],
    [3, 'n', 'третє'],
    [3, 'f', 'третя'],
    [4, 'n', 'четверте'],
    [5, 'm', "п'ятий"],
    [5, 'n', "п'яте"],
    [6, 'n', 'шосте'],
    [7, 'f', 'сьома'],
    [8, 'n', 'восьме'],
    [9, 'n', "дев'яте"],
    [10, 'n', 'десяте'],
    [11, 'n', 'одинадцяте'],
    [15, 'n', "п'ятнадцяте"],
    [19, 'm', "дев'ятнадцятий"],
    [20, 'n', 'двадцяте'],
    [23, 'n', 'двадцять третє'],
    [30, 'n', 'тридцяте'],
    [31, 'n', 'тридцять перше'],
    [40, 'm', 'сороковий'],
    [50, 'm', "п'ятдесятий"],
    [90, 'm', "дев'яностий"],
    [100, 'm', 'сотий'],
    [200, 'm', 'двохсотий'],
    [300, 'm', 'трьохсотий'],
    [500, 'm', "п'ятисотий"],
    [900, 'm', "дев'ятисотий"],
    [1000, 'm', 'тисячний'],
    [2000, 'm', 'двотисячний'],
    [5000, 'm', "п'ятитисячний"],
  ];
  it.each(table)('%i (%s) → %s', (n, g, words) => {
    expect(ordinal(n, g)).toBe(u(words));
  });

  it('genitive ordinals', () => {
    expect(ordinalGenitive(1987)).toBe(u("тисяча дев'ятсот вісімдесят сьомого"));
    expect(ordinalGenitive(3)).toBe('третього');
    expect(ordinalGenitive(2)).toBe('другого');
    expect(ordinalGenitive(2000)).toBe('двотисячного');
  });
});

describe('formatDate — neuter ordinal + genitive month', () => {
  const table: [number, number, string][] = [
    [5, 3, "п'яте березня"],
    [1, 1, 'перше січня'],
    [2, 2, 'друге лютого'],
    [3, 4, 'третє квітня'],
    [9, 5, "дев'яте травня"],
    [12, 6, 'дванадцяте червня'],
    [13, 7, 'тринадцяте липня'],
    [24, 8, 'двадцять четверте серпня'],
    [1, 9, 'перше вересня'],
    [30, 10, 'тридцяте жовтня'],
    [7, 11, 'сьоме листопада'],
    [31, 12, 'тридцять перше грудня'],
    [21, 1, 'двадцять перше січня'],
    [29, 2, "двадцять дев'яте лютого"],
  ];
  it.each(table)('%i/%i → %s', (d, m, words) => {
    expect(formatDate(d, m)).toBe(u(words));
  });

  it('rejects impossible days', () => {
    expect(() => formatDate(31, 4)).toThrow(RangeError);
    expect(() => formatDate(30, 2)).toThrow(RangeError);
    expect(() => formatDate(0, 1)).toThrow(RangeError);
    expect(() => formatDate(1, 13)).toThrow(RangeError);
  });
});

describe('formatYear — masculine ordinal + «рік»', () => {
  const table: [number, string][] = [
    [1987, "тисяча дев'ятсот вісімдесят сьомий рік"],
    [1990, "тисяча дев'ятсот дев'яностий рік"],
    [1900, "тисяча дев'ятисотий рік"],
    [1941, "тисяча дев'ятсот сорок перший рік"],
    [1991, "тисяча дев'ятсот дев'яносто перший рік"],
    [2000, 'двотисячний рік'],
    [2001, 'дві тисячі перший рік'],
    [2010, 'дві тисячі десятий рік'],
    [2014, 'дві тисячі чотирнадцятий рік'],
    [2026, 'дві тисячі двадцять шостий рік'],
    [2040, 'дві тисячі сороковий рік'],
    [2100, 'дві тисячі сотий рік'],
  ];
  it.each(table)('%i → %s', (y, words) => {
    expect(formatYear(y)).toBe(u(words));
  });
});

describe('toSpeech — the apostrophe form Piper is handed', () => {
  it('maps the internal U+02BC to the spoken form and leaves other text alone', () => {
    expect(toSpeech(cardinal(5))).toBe("п'ять");
    expect(toSpeech(cardinal(99))).toBe("дев'яносто дев'ять");
    expect(toSpeech('три чотири')).toBe('три чотири');
  });
});

describe('invariants', () => {
  it('rejects out-of-range and non-integers', () => {
    expect(() => cardinal(-1)).toThrow(RangeError);
    expect(() => cardinal(1.5)).toThrow(RangeError);
    expect(() => formatClock(24, 0)).toThrow(RangeError);
    expect(() => formatClock(10, 60)).toThrow(RangeError);
    expect(() => formatPrice(1, 100)).toThrow(RangeError);
  });

  it('never emits digits, Latin or Russian-only letters; always NFC', () => {
    const samples: string[] = [];
    for (let n = 0; n <= 2200; n += 1) samples.push(cardinal(n), cardinal(n, 'f'));
    for (const n of [10_000, 54_321, 100_000, 999_999, 1_000_000, 123_456_789]) {
      samples.push(cardinal(n));
    }
    for (let y = 1900; y <= 2100; y += 1) samples.push(formatYear(y));
    for (let h = 0; h < 24; h += 1) samples.push(formatClock(h, h * 2), formatClock(h, 0, 'full'));
    for (const s of samples) {
      expect(s).toBe(s.normalize('NFC'));
      expect(s).not.toMatch(/[0-9A-Za-z]/);
      expect(s).not.toMatch(/[\u0451\u044B\u044D\u044A]/);
    }
  });

  it('word count is monotone across the teens/tens (spot ranges)', () => {
    const wc = (n: number): number => cardinal(n).split(' ').length;
    expect(wc(20)).toBeLessThan(wc(21));
    expect(wc(100)).toBeLessThan(wc(101));
    expect(wc(1000)).toBeLessThan(wc(1001));
    expect(wc(21)).toBe(wc(29));
  });

  it('every number word survives the answer fold (apostrophe words match normalizeUk)', () => {
    expect(normalizeUk(cardinal(5))).toBe(normalizeUk("п'ять"));
    expect(normalizeUk(cardinal(900))).toBe(normalizeUk("дев'ятсот"));
  });
});
