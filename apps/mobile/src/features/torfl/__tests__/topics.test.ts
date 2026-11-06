import { EXAM_SUBTEST_KINDS } from '@sutinki/schema';
import { describe, expect, it } from 'vitest';

import {
  SUBTEST_LABELS,
  SUBTEST_ORDER,
  TOPICS,
  TOPIC_ORDER,
  compareTopics,
  isKnownTopic,
  topicLabel,
} from '../topics';

const GRAMMAR_SLUGS: readonly string[] = Array.from(
  { length: 38 },
  (_, i) => `g${String(i + 1).padStart(2, '0')}`,
);
// Copied from packages/pipeline/src/exam-topics.ts (the app does not import the pipeline).
const PIPELINE_TOPICS = {
  lexgram: GRAMMAR_SLUGS,
  reading: ['rd-heading', 'rd-tf', 'rd-qa', 'rd-gap-word', 'rd-gap-form', 'rd-detail'],
  listening: ['ls-mc3', 'ls-tf'],
  writing: ['wr-message', 'wr-text'],
  speaking: ['sp-photo', 'sp-monologue', 'sp-dialogue'],
} as const;
const THEME_SLUGS = [
  'liudyna',
  'dim',
  'misto',
  'pobut',
  'diialnist',
  'dozvillia',
  'podorozhi',
  'kupivlia',
  'iidalnia',
  'zdorovia',
  'pryroda',
  'sviata',
];

describe('topics (Іспит taxonomy, UT16b)', () => {
  it('every pipeline skill / grammar slug has a Ukrainian label, an English gloss and its kind', () => {
    for (const [kind, slugs] of Object.entries(PIPELINE_TOPICS)) {
      for (const slug of slugs) {
        expect(isKnownTopic(slug), slug).toBe(true);
        const l = topicLabel(slug);
        expect(l.uk.length, slug).toBeGreaterThan(0);
        expect(l.en.length, slug).toBeGreaterThan(0);
        expect(l.uk, slug).not.toBe(slug);
        expect(l.subtestKind, slug).toBe(kind);
      }
    }
  });

  it('the 12 themes exist, belong to no section, and are labelled', () => {
    for (const slug of THEME_SLUGS) {
      expect(isKnownTopic(slug), slug).toBe(true);
      const l = topicLabel(slug);
      expect(l.subtestKind).toBeNull();
      expect(l.uk).not.toBe(slug);
      expect(l.en).not.toBe(slug);
    }
    expect(topicLabel('misto').uk).toBe('Місто');
    expect(topicLabel('iidalnia').en).toBe('Food');
  });

  it('g01…g38 are present, lexgram, and nothing else is', () => {
    expect(GRAMMAR_SLUGS).toHaveLength(38);
    for (const g of GRAMMAR_SLUGS) expect(topicLabel(g).subtestKind).toBe('lexgram');
    expect(isKnownTopic('g39')).toBe(false);
    expect(TOPIC_ORDER).toHaveLength(13 + 12 + 38);
    expect(topicLabel('ls-mc3')).toEqual({
      uk: 'Слухання: оберіть відповідь',
      en: 'Listening: pick the answer',
      subtestKind: 'listening',
    });
    expect(topicLabel('sp-monologue').uk).toBe('Монолог');
  });

  it('no authored label carries Russian-only letters', () => {
    for (const slug of TOPIC_ORDER) {
      const l = topicLabel(slug);
      expect(l.uk, slug).not.toMatch(/[\u0451\u044B\u044D\u044A]/i);
    }
  });

  it('an unknown slug renders raw (never dropped)', () => {
    expect(topicLabel('case-voc')).toEqual({ uk: 'case-voc', en: 'case-voc', subtestKind: null });
    expect(topicLabel('case-prep').uk).toBe('case-prep'); // an old TORFL slug is unknown now
    expect(isKnownTopic('constructor')).toBe(false);
  });

  it('compareTopics: table order first, unknown slugs last alphabetically', () => {
    expect(['g02', 'zz-new', 'rd-tf', 'aa-new', 'ls-mc3', 'misto'].sort(compareTopics)).toEqual([
      'ls-mc3',
      'rd-tf',
      'misto',
      'g02',
      'aa-new',
      'zz-new',
    ]);
  });

  it('SUBTEST_LABELS: Ukrainian titles for the four sections and the grammar drills', () => {
    expect(SUBTEST_ORDER).toEqual(['listening', 'reading', 'writing', 'speaking', 'lexgram']);
    expect(SUBTEST_ORDER.map((k) => SUBTEST_LABELS[k].uk)).toEqual([
      'Слухання',
      'Читання',
      'Письмо',
      'Говоріння',
      'Граматика (тренування)',
    ]);
    expect(Object.keys(SUBTEST_LABELS).sort()).toEqual([...EXAM_SUBTEST_KINDS].sort());
  });
});

describe('bank a topic (pure)', () => {
  it('gated to an Іспит shelf + tag ukr-exam:lexicon', async () => {
    const { canBankTopic } = await import('../bank-topic');
    expect(canBankTopic({ category: 'ukr-exam-a1', tags: ['ukr-exam', 'ukr-exam:lexicon'] })).toBe(
      true,
    );
    expect(canBankTopic({ category: 'ukr-exam-b1', tags: ['ukr-exam'] })).toBe(false);
    expect(canBankTopic({ category: null, tags: ['ukr-exam:lexicon'] })).toBe(false);
    expect(canBankTopic({ category: 'stories', tags: ['family:tall-dog'] })).toBe(false);
  });

  it('toast copy + topic slug', async () => {
    const { bankTopicToast, topicSlugOfStory } = await import('../bank-topic');
    // T82: the toast says how the words arrive (the daily new-word budget).
    expect(bankTopicToast(1)).toBe('+1 слово у Словнику · по 10 на день');
    expect(bankTopicToast(23, 5)).toBe('+23 слова у Словнику · по 5 на день');
    expect(bankTopicToast(67)).toBe('+67 слів у Словнику · по 10 на день');
    expect(bankTopicToast(0)).toBe('+0 слів — усі слова вже в Словнику');
    expect(topicSlugOfStory('lx-o-sebe')).toBe('o-sebe');
    expect(topicSlugOfStory('rd-01')).toBe('rd-01');
  });
});
