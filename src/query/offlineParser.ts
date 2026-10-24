import { CATEGORIES, DISTRICTS, LAST_MONTH, MONTH_COUNT, monthKey } from '../data/meta';
import type { GroupBy, Metric, QueryPlan } from './types';

export interface ParseResult {
  plan: QueryPlan;
  /** 0 means nothing recognisable was found; the caller should not guess. */
  confidence: number;
  /** What was recognised, shown to the user so they can see how the question was read. */
  matched: string[];
}

// Word lists in English, Hindi (Devanagari and romanised) and Kannada. Deliberately small and explicit:
// this is the fallback for when no model is reachable, so it favours predictable over clever.
const LEX = {
  avgTime: ['average', 'avg', 'mean', 'औसत', 'ausat', 'ಸರಾಸರಿ', 'how long', 'kitne din', 'कितने दिन', 'कितना समय', 'resolution time', 'time to resolve', 'days to resolve'],
  rate: ['rate', 'percentage', 'percent', '%', 'प्रतिशत', 'दर', 'ಶೇಕಡಾ'],
  byDistrict: ['district', 'districts', 'जिला', 'जिले', 'जिलों', 'zila', 'jila', 'ಜಿಲ್ಲೆ', 'ಜಿಲ್ಲೆಗಳು'],
  byCategory: ['category', 'categories', 'type', 'types', 'kind', 'श्रेणी', 'प्रकार', 'ವರ್ಗ', 'ವಿಧ'],
  byMonth: ['month', 'monthly', 'months', 'trend', 'over time', 'each month', 'महीने', 'महीना', 'मासिक', 'mahine', 'ತಿಂಗಳು', 'ತಿಂಗಳ'],
  byStatus: ['status', 'स्थिति', 'ಸ್ಥಿತಿ'],
  map: ['map', 'नक्शा', 'नक्शे', 'ನಕ್ಷೆ'],
  top: ['top', 'most', 'highest', 'worst', 'सबसे ज्यादा', 'सबसे ज़्यादा', 'sabse zyada', 'sabse jyada', 'ಹೆಚ್ಚು'],
  bottom: ['lowest', 'least', 'fewest', 'best', 'सबसे कम', 'sabse kam', 'ಕಡಿಮೆ'],
  open: ['open', 'pending', 'unresolved', 'लंबित', 'खुली', 'खुले', 'lambit', 'ಬಾಕಿ'],
  resolved: ['resolved', 'solved', 'fixed', 'हल', 'निपटाए', 'निपटाई', 'ಪರಿಹರಿಸಲಾದ'],
  inProgress: ['in progress', 'ongoing', 'चल रही', 'चल रहे'],
  lastMonth: ['last month', 'previous month', 'पिछले महीने', 'पिछला महीना', 'pichhle mahine', 'pichle mahine'],
  thisYear: ['this year', '2026', 'इस साल', 'is saal'],
  lastYear: ['last year', '2025', 'पिछले साल', 'pichhle saal'],
  lastN: ['last', 'past', 'पिछले', 'pichhle', 'pichle'],
};

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };

const norm = (s: string) => s.normalize('NFC').toLowerCase();

/** Removes the first occurrence of a phrase so a longer alias ("bengaluru rural") is not also read as a shorter one. */
function take(text: string, phrase: string): string | null {
  const ascii = /^[\x20-\x7e]+$/.test(phrase);
  const re = ascii ? new RegExp(`(^|[^a-z0-9])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`) : null;
  if (re) {
    const m = re.exec(text);
    return m ? text.slice(0, m.index + m[1].length) + ' '.repeat(phrase.length) + text.slice(m.index + m[0].length) : null;
  }
  const i = text.indexOf(phrase);
  return i === -1 ? null : text.slice(0, i) + ' '.repeat(phrase.length) + text.slice(i + phrase.length);
}

function hasAny(text: string, phrases: string[]): { text: string; hit: string | null } {
  for (const p of [...phrases].sort((a, b) => b.length - a.length)) {
    const next = take(text, p);
    if (next !== null) return { text: next, hit: p };
  }
  return { text, hit: null };
}

function findAll<T extends { id: string; aliases: string[] }>(text: string, items: T[]): { text: string; ids: string[]; hits: string[] } {
  const entries = items.flatMap(it => it.aliases.map(a => ({ id: it.id, alias: norm(a) }))).sort((a, b) => b.alias.length - a.alias.length);
  const ids = new Set<string>();
  const hits: string[] = [];
  let rest = text;
  for (const e of entries) {
    const next = take(rest, e.alias);
    if (next !== null) { rest = next; ids.add(e.id); hits.push(e.alias); }
  }
  return { text: rest, ids: [...ids], hits };
}

const monthsBack = (n: number): string => monthKey(Math.max(0, MONTH_COUNT - n));

/** Reads a question without any network. Returns confidence 0 when nothing in it is recognised. */
export function parseOffline(question: string): ParseResult {
  let text = ` ${norm(question).replace(/[?!.,;]/g, ' ')} `;
  const matched: string[] = [];
  let signals = 0;
  const note = (label: string) => { matched.push(label); signals++; };

  const plan: QueryPlan = { metric: 'count', groupBy: 'none', filters: {} };

  const districts = findAll(text, DISTRICTS); text = districts.text;
  if (districts.ids.length) { plan.filters.districts = districts.ids; note(`district: ${districts.hits.join(', ')}`); }
  const cats = findAll(text, CATEGORIES); text = cats.text;
  if (cats.ids.length) { plan.filters.categories = cats.ids; note(`category: ${cats.hits.join(', ')}`); }

  // Time window, longest phrase first so "last month" is not read as the bare word "last".
  let r = hasAny(text, LEX.lastMonth); text = r.text;
  if (r.hit) { plan.filters.from = plan.filters.to = LAST_MONTH; note('time: last month'); }
  else {
    const nMonths = /(?:last|past|पिछले|pichhle|pichle)\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+(?:months?|महीने|mahine)/.exec(text);
    if (nMonths) {
      const n = NUMBER_WORDS[nMonths[1]] ?? Number(nMonths[1]);
      plan.filters.from = monthsBack(n); plan.filters.to = LAST_MONTH; note(`time: last ${n} months`);
      text = text.replace(nMonths[0], ' ');
    } else {
      r = hasAny(text, LEX.thisYear); text = r.text;
      if (r.hit) { plan.filters.from = '2026-01'; plan.filters.to = LAST_MONTH; note('time: 2026'); }
      else {
        r = hasAny(text, LEX.lastYear); text = r.text;
        if (r.hit) { plan.filters.from = '2025-01'; plan.filters.to = '2025-12'; note('time: 2025'); }
      }
    }
  }

  const statuses: string[] = [];
  for (const [ids, list] of [['in-progress', LEX.inProgress], ['resolved', LEX.resolved], ['open', LEX.open]] as const) {
    r = hasAny(text, list); text = r.text;
    if (r.hit) { statuses.push(ids); matched.push(`status: ${ids}`); }
  }
  if (statuses.length) { plan.filters.statuses = statuses; signals++; }

  // Grouping: "by district" style words, unless a single district was named (then the user wants that one place).
  const group = (words: string[], g: GroupBy, label: string) => {
    const x = hasAny(text, words); text = x.text;
    if (x.hit && plan.groupBy === 'none') { plan.groupBy = g; note(`grouped by ${label}`); }
  };
  group(LEX.byMonth, 'month', 'month');
  group(LEX.byDistrict, 'district', 'district');
  group(LEX.byCategory, 'category', 'category');
  group(LEX.byStatus, 'status', 'status');

  r = hasAny(text, LEX.map); text = r.text;
  if (r.hit) { plan.chart = 'map'; if (plan.groupBy === 'none') plan.groupBy = 'district'; note('map view'); }

  // "Which district has the most ..." names no grouping word besides "district", already handled above.
  const avg = hasAny(text, LEX.avgTime); text = avg.text;
  const rate = hasAny(text, LEX.rate); text = rate.text;
  let metric: Metric = 'count';
  if (avg.hit) metric = 'avg_resolution_days';
  else if (rate.hit) metric = 'resolution_rate';
  if (metric !== 'count') note(`metric: ${metric.replace(/_/g, ' ')}`);
  plan.metric = metric;

  const topN = /(?:top|सबसे ज्यादा|सबसे ज़्यादा)\s*(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\b/.exec(text);
  const top = hasAny(text, LEX.top); text = top.text;
  const bottom = hasAny(text, LEX.bottom); text = bottom.text;
  if (plan.groupBy !== 'none' && plan.groupBy !== 'month') {
    if (top.hit || topN) { plan.sort = 'desc'; plan.limit = topN ? (NUMBER_WORDS[topN[1]] ?? Number(topN[1])) : 5; note('ranked: highest first'); }
    else if (bottom.hit) { plan.sort = 'asc'; plan.limit = 5; note('ranked: lowest first'); }
  }

  // A bare "how many complaints" is a valid question; a sentence with no recognised words is not.
  const countWords = hasAny(text, ['how many', 'count', 'number', 'total', 'कितने', 'कितनी', 'ಎಷ್ಟು', 'kitne', 'kitni', 'complaints', 'complaint', 'शिकायत', 'शिकायतें', 'ದೂರು']);
  if (countWords.hit && signals === 0) note('count of complaints');

  const confidence = signals === 0 ? 0 : Math.min(1, 0.3 + 0.2 * signals);
  return { plan, confidence, matched };
}
