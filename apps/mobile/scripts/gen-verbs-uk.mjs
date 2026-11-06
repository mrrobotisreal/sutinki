/**
 * Generates src/features/torfl/grading/verbs-uk.generated.ts (UISS-010) — every inflected form of the A1 core
 * VERB lemmas (sutinki-content/series/_core/uk-a1-core.tsv) plus a short EXTRAS list of everyday verbs the exam
 * model answers use. Committed output; rerun only to retune:
 *
 *   node scripts/gen-verbs-uk.mjs [path/to/uk-a1-core.tsv]
 *
 * The core TSV is read to PROVE coverage (every VERB lemma must have a spec below, else this exits non-zero);
 * the spec table gives each lemma's stem + conjugation class, the rest is generated:
 *   infinitive (-ти / -тися / -тись / -чи), present or synthetic future (6 persons), past (m/f/n/pl),
 *   imperative (2sg, 1pl, 2pl), and the -ся / -сь variants for reflexives (R).
 * Spec grammar `inf  kind  stem  [1sg  [3pl]]`:
 *   J  vowel stem  -> ю єш є ємо єте ють      C  consonant stem -> у еш е емо ете уть
 *   I  -> 1sg given, S+иш ить имо ите, 3pl given      X  explicit: `inf X p1 p2 p3 p4 p5 p6 | past m f n pl | imp 2sg`
 * Forms are normalizeUk output (lower-case, apostrophe U+02BC, ґ -> г).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '../src/features/torfl/grading/verbs-uk.generated.ts');
const REL = 'sutinki-content/series/_core/uk-a1-core.tsv';
// main checkout: <ws>/Sutinki/apps/mobile/scripts; worktree: <ws>/Sutinki/.worktrees/<t>/apps/mobile/scripts
const DEFAULT_TSV = [join(here, '../../../../', REL), join(here, '../../../../../../', REL)].find(
  (p) => existsSync(p),
);

// inf:kind:stem[:1sg[:3pl]] — R after kind = reflexive; pastOverride after `/` as m,f,n,pl; imperative after `~` as sg
const SPECS = `
мати:J:ма
хотіти:C:хоч
мусити:I:мус:мушу:мусять
вміти:J:вмі
знати:J:зна
розуміти:J:розумі
любити:I:люб:люблю:люблять
казати:C:каж
говорити:I:говор:говорю:говорять
робити:I:роб:роблю:роблять
бачити:I:бач:бачу:бачать
дивитися:IR:див:дивлю:дивлять
слухати:J:слуха
чути:J:чу
читати:J:чита
писати:C:пиш
жити:C:жив
працювати:J:працю
вчитися:IR:вч:вчу:вчать
вивчати:J:вивча
ходити:I:ход:ходжу:ходять
їхати:C:їд
їздити:I:їзд:їжджу:їздять
приходити:I:приход:приходжу:приходять
приїжджати:J:приїжджа
давати:J:да
брати:C:бер
взяти:C:візьм
питати:J:пита
відповідати:J:відповіда
чекати:J:чека
допомагати:J:допомага
називатися:JR:назива
звати:C:зв
подобатися:JR:подоба
купувати:J:купу
купити:I:куп:куплю:куплять
пити:J:п'
спати:I:сп:сплю:сплять
сидіти:I:сид:сиджу:сидять
лежати:I:леж:лежу:лежать
починатися:JR:почина
закінчуватися:JR:закінчу
відкривати:J:відкрива
закривати:J:закрива
думати:J:дума
дякувати:J:дяку
просити:I:прос:прошу:просять
зробити:I:зроб:зроблю:зроблять
сказати:C:скаж
написати:C:напиш
прочитати:J:прочита
побачити:I:побач:побачу:побачать
зрозуміти:J:зрозумі
запитати:J:запита
вибачити:I:вибач:вибачу:вибачать
пробачити:I:пробач:пробачу:пробачать
почати:C:почн
закінчити:I:закінч:закінчу:закінчать
повернутися:CR:поверн
народитися:IR:народ:народжу:народять
мешкати:J:мешка
будити:I:буд:буджу:будять
прокидатися:JR:прокида
вмиватися:JR:вмива
прати:C:пер
прибирати:J:прибира
готувати:J:готу
відпочивати:J:відпочива
починати:J:почина
закінчувати:J:закінчу
малювати:J:малю
грати:J:гра
гуляти:J:гуля
подорожувати:J:подорожу
танцювати:J:танцю
співати:J:співа
плавати:J:плава
бігати:J:біга
летіти:I:лет:лечу:летять
зупинятися:JR:зупиня
від'їжджати:J:від'їжджа
коштувати:J:кошту
платити:I:плат:плачу:платять
продавати:J:прода
замовляти:J:замовля
замовити:I:замов:замовлю:замовлять
смакувати:J:смаку
снідати:J:сніда
обідати:J:обіда
вечеряти:J:вечеря
боліти:I:бол:болю:болять
хворіти:J:хворі
кашляти:J:кашля
відчувати:J:відчува
падати:J:пада
світити:I:світ:свічу:світять
вітати:J:віта
запрошувати:J:запрошу
`;

// Explicit irregulars: inf | p1 p2 p3 p4 p5 p6 | past m f n pl | imperative sg
const IRREG = `
бути | буду будеш буде будемо будете будуть | був була було були | будь
є | є | | 
могти | можу можеш може можемо можете можуть | міг могла могло могли | 
іти | іду ідеш іде ідемо ідете ідуть | йшов йшла йшло йшли | йди
йти | йду йдеш йде йдемо йдете йдуть | йшов йшла йшло йшли | йди
ходити | | ходив ходила ходило ходили | ходи
дати | дам даси дасть дамо дасте дадуть | дав дала дало дали | дай
їсти | їм їси їсть їмо їсте їдять | їв їла їло їли | їж
стояти | стою стоїш стоїть стоїмо стоїте стоять | стояв стояла стояло стояли | стій
допомогти | допоможу допоможеш допоможе допоможемо допоможете допоможуть | допоміг допомогла допомогло допомогли | допоможи
розповісти | розповім розповіси розповість розповімо розповісте розповідять | розповів розповіла розповіло розповіли | розкажи
відповісти | відповім відповіси відповість відповімо відповісте відповідять | відповів відповіла відповіло відповіли | відповідай
вийти | вийду вийдеш вийде вийдемо вийдете вийдуть | вийшов вийшла вийшло вийшли | вийди
зайти | зайду зайдеш зайде зайдемо зайдете зайдуть | зайшов зайшла зайшло зайшли | зайди
прийти | прийду прийдеш прийде прийдемо прийдете прийдуть | прийшов прийшла прийшло прийшли | прийди
піти | піду підеш піде підемо підете підуть | пішов пішла пішло пішли | іди
сісти | сяду сядеш сяде сядемо сядете сядуть | сів сіла сіло сіли | сядь
пливти | пливу пливеш пливе пливемо пливете пливуть | плив пливла пливло пливли | пливи
нести | несу несеш несе несемо несете несуть | ніс несла несло несли | неси
вести | веду ведеш веде ведемо ведете ведуть | вів вела вело вели | веди
везти | везу везеш везе веземо везете везуть | віз везла везло везли | вези
вставати | встаю встаєш встає встаємо встаєте встають | вставав вставала вставало вставали | вставай
взяти | візьму візьмеш візьме візьмемо візьмете візьмуть | взяв взяла взяло взяли | візьми
`;

// Everyday verbs beyond the 114 core lemmas that the exam model answers (UEX008/UEX009) and a learner's
// monologue use. Same grammar as SPECS.
const EXTRAS = `
тримати:J:трима
розмовляти:J:розмовля
стояти:J:стоя
запросити:I:запрос:запрошу:запросять
пропонувати:J:пропону
вирішити:I:вирішит:вирішу:вирішать
телефонувати:J:телефону
зателефонувати:J:зателефону
дзвонити:I:дзвон:дзвоню:дзвонять
подарувати:J:подару
святкувати:J:святку
пояснювати:J:пояснюва
повторювати:J:повторюва
пробувати:J:пробу
мріяти:J:мрія
цікавитися:IR:цікав:цікавлюся:цікавлять
усміхатися:JR:усміха
познайомитися:IR:познайом:познайомлю:познайомлять
зустрічатися:JR:зустріча
зустрічати:J:зустріча
зустріти:I:зустр:зустріну:зустрінуть
отримати:J:отрима
отримувати:J:отримую
подивитися:IR:подив:подивлю:подивлять
згадати:J:згада
шукати:J:шука
вчити:I:вч:вчу:вчать
жити:C:жив
лягати:J:ляга
сподобатися:JR:сподоба
повертатися:JR:повертаю
повернути:C:поверн
вмити:C:вм
відчинити:I:відчин:відчиню:відчинять
чистити:I:чист:чищу:чистять
мити:J:ми
сушити:I:суш:сушу:сушать
варити:I:вар:варю:варять
смажити:I:смаж:смажу:смажать
пекти:C:печ
замовлятися:JR:замовля
телефонувати:J:телефону
сфотографувати:J:сфотографу
фотографувати:J:фотографу
чекати:J:чека
стрибати:J:стриба
кричати:I:крич:кричу:кричать
сміятися:JR:смія
плакати:C:плач
сумувати:J:суму
радіти:J:раді
втомитися:IR:втом:втомлю:втомлять
хвилюватися:JR:хвилю
пам'ятати:J:пам'ята
забути:C:забуд
забувати:J:забува
сподіватися:JR:сподіва
намагатися:JR:намага
вирішувати:J:вирішу
жартувати:J:жарту
складати:J:склада
вибирати:J:вибира
вибрати:C:вибер
ставити:I:став:ставлю:ставлять
класти:C:клад
лишати:J:лиша
лишити:I:лиш:лишу:лишать
залишати:J:залиша
залишити:I:залиш:залишу:залишать
проводити:I:провод:проводжу:проводять
провести:C:проведу
розмовляти:J:розмовля
тренуватися:JR:тренуюся
відвідувати:J:відвіду
відвідати:J:відвіда
подорожувати:J:подорожу
вживати:J:вжива
користуватися:JR:користу
дарувати:J:дару
відправлятися:JR:відправля
відправити:I:відправ:відправлю:відправлять
прилетіти:I:прилет:прилечу:прилетять
прилітати:J:приліта
вилетіти:I:вилет:вилечу:вилетять
вилітати:J:виліта
летіти:I:лет:лечу:летять
поїхати:C:поїд
приїхати:C:приїд
виїхати:C:виїд
переїхати:C:переїд
доїхати:C:доїд
поїсти:C:поїм
поспати:I:посп:посплю:поспять
відпочити:C:відпочин
відпочинути:C:відпочин
виходити:I:виход:виходжу:виходять
заходити:I:заход:заходжу:заходять
переїжджати:J:переїжджа
підходити:I:підход:підходжу:підходять
підійти:C:підійд
дійти:C:дійд
перейти:C:перейд
привезти:C:привез
принести:C:принес
приносити:I:принос:приношу:приносять
привозити:I:привоз:привожу:привозять
продати:C:прода
купляти:J:купля
вибігти:C:вибіг
побігти:C:побіг
стати:C:стан
ставати:J:ста
лишатися:JR:лиша
залишатися:JR:залиша
сподобатися:JR:сподоба
`;

// Longest suffix first; value = the reflexive replacement (the -ся/-сь short variant is derived).
const REFL = [
  ['ють', 'ються'],
  ['ять', 'яться'],
  ['ать', 'аться'],
  ['уть', 'уться'],
  ['ить', 'иться'],
  ['ємо', 'ємося'],
  ['єте', 'єтеся'],
  ['емо', 'емося'],
  ['ете', 'етеся'],
  ['имо', 'имося'],
  ['ите', 'итеся'],
  ['єш', 'єшся'],
  ['еш', 'ешся'],
  ['иш', 'ишся'],
  ['ти', 'тися'],
  ['ла', 'лася'],
  ['ло', 'лося'],
  ['ли', 'лися'],
  ['мо', 'мося'],
  ['те', 'теся'],
  ['є', 'ється'],
  ['е', 'еться'],
  ['в', 'вся'],
  ['ю', 'юся'],
  ['у', 'уся'],
  ['й', 'йся'],
  ['и', 'ися'],
  ['ь', 'ься'],
];
function reflexive(forms) {
  const out = new Set();
  for (const f of forms) {
    for (const [suf, rep] of REFL) {
      if (f.endsWith(suf)) {
        const r = f.slice(0, -suf.length) + rep;
        out.add(r);
        if (r.endsWith('ся') && !r.endsWith('ться') && !r.endsWith('шся'))
          out.add(r.slice(0, -2) + 'сь');
        if (suf === 'ти') out.add(f + 'сь');
        break;
      }
    }
  }
  return out;
}

function norm(s) {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/['’ʼ`]/g, 'ʼ')
    .replaceAll('ґ', 'г');
}

function pastFrom(inf, over) {
  if (over) return over;
  const base = inf.replace(/ти$/, '');
  return [base + 'в', base + 'ла', base + 'ло', base + 'ли'];
}

function presentOf(kind, stem, p1, p3) {
  switch (kind) {
    case 'J':
      return [stem + 'ю', stem + 'єш', stem + 'є', stem + 'ємо', stem + 'єте', stem + 'ють'];
    case 'C':
      return [stem + 'у', stem + 'еш', stem + 'е', stem + 'емо', stem + 'ете', stem + 'уть'];
    case 'I':
      return [p1, stem + 'иш', stem + 'ить', stem + 'имо', stem + 'ите', p3];
    default:
      throw new Error('kind ' + kind);
  }
}

function impOf(kind, stem, p1) {
  if (kind === 'J') return [stem + 'й', stem + 'ймо', stem + 'йте'];
  const root = kind === 'I' ? stem : stem;
  return [root + 'и', root + 'імо', root + 'іть', p1 && kind === 'I' ? p1 : ''];
}

const all = new Map(); // lemma -> Set(forms)
function add(lemma, forms) {
  const s = all.get(lemma) ?? new Set();
  for (const f of forms) if (f) s.add(norm(f));
  all.set(lemma, s);
}

function fromSpec(line) {
  const [inf, k, stem, p1, p3] = line.split(':');
  const refl = k.includes('R');
  const kind = k.replace('R', '');
  const lemmaInf = inf.replace(/ся$/, '');
  const infBase = refl ? inf.replace(/ся$/, '') : inf;
  let forms = [infBase.replace(/ти$/, 'ти')];
  const pres = presentOf(kind, stem, p1, p3);
  const past = pastFrom(infBase);
  const imp = impOf(kind, stem, p1).filter(Boolean);
  forms = [infBase, ...pres, ...past, ...imp];
  if (infBase.endsWith('ти')) forms.push(infBase.replace(/ти$/, 'в') + (refl ? '' : ''));
  const set = new Set(forms);
  if (refl) {
    const r = reflexive(set);
    r.add(infBase + 'ся');
    r.add(infBase + 'сь');
    add(inf, r);
  } else add(inf, set);
}

function fromIrreg(line) {
  const [inf, pres, past, imp] = line.split('|').map((x) => x.trim());
  const forms = [inf, ...pres.split(/\s+/), ...past.split(/\s+/), ...imp.split(/\s+/)].filter(
    Boolean,
  );
  add(inf, forms);
}

const lines = (t) =>
  t
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
for (const l of lines(SPECS)) fromSpec(l);
for (const l of lines(IRREG)) fromIrreg(l);
for (const l of lines(EXTRAS)) fromSpec(l);

// Coverage proof against the core TSV.
const tsv = process.argv[2] ?? DEFAULT_TSV;
const verbs = readFileSync(tsv, 'utf8')
  .split('\n')
  .slice(1)
  .map((r) => r.split('\t'))
  .filter((c) => c[1] === 'VERB')
  .map((c) => c[0]);
const have = new Set([...all.keys()].map(norm));
const missing = verbs.filter((v) => !have.has(norm(v)));
if (missing.length > 0) {
  console.error('core VERB lemmas without a spec:', missing.join(' '));
  process.exit(1);
}

const forms = new Set();
for (const s of all.values()) for (const f of s) if (f.length >= 2) forms.add(f);
const sorted = [...forms].sort((a, b) => a.localeCompare(b, 'uk'));
const rows = [];
let cur = '';
for (const f of sorted) {
  if ((cur + ' ' + f).length > 96) {
    rows.push(cur);
    cur = f;
  } else cur = cur ? cur + ' ' + f : f;
}
if (cur) rows.push(cur);
const body = `/**
 * GENERATED by apps/mobile/scripts/gen-verbs-uk.mjs from sutinki-content/series/_core/uk-a1-core.tsv
 * (${verbs.length} VERB lemmas + extras) — do not hand-edit; edit the spec table and rerun. UISS-010.
 * Whole inflected forms, normalizeUk output (lower-case, ʼ, ґ→г).
 */
const RAW = \`
${rows.join('\n')}
\`;

export const GENERATED_VERB_FORMS: ReadonlySet<string> = new Set(RAW.split(/\\s+/).filter(Boolean));
`;
writeFileSync(OUT, body);
console.log(`lemmas ${all.size} (core verbs ${verbs.length}), forms ${sorted.length}`);
