import { CATEGORIES, DISTRICTS, STATUSES, monthIndex } from '../data/meta';
import type { ChartKind, GroupBy, Metric, QueryPlan } from './types';

const METRICS: Metric[] = ['count', 'avg_resolution_days', 'resolution_rate'];
const GROUPS: GroupBy[] = ['district', 'category', 'status', 'month', 'none'];
const CHARTS: ChartKind[] = ['auto', 'bar', 'line', 'map'];
const DISTRICT_IDS = new Set(DISTRICTS.map(d => d.id));
const CATEGORY_IDS = new Set(CATEGORIES.map(c => c.id));
const STATUS_IDS = new Set<string>(STATUSES.map(s => s.id));
export const MAX_LIMIT = 30;

export type Validation = { ok: true; plan: QueryPlan } | { ok: false; error: string };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function idList(value: unknown, allowed: Set<string>, what: string): string[] | undefined | Error {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) return new Error(`${what} must be a list`);
  const ids = value.filter((v): v is string => typeof v === 'string');
  const unknown = ids.filter(id => !allowed.has(id));
  // Unknown ids mean the model invented a value. Refuse rather than silently answering a different question.
  if (unknown.length) return new Error(`Unknown ${what}: ${unknown.join(', ')}`);
  return ids.length ? ids : undefined;
}

/** Checks untrusted output (model JSON or parser output) against the closed plan shape. */
export function validatePlan(input: unknown): Validation {
  if (!isRecord(input)) return { ok: false, error: 'The answer was not a query plan.' };
  const metric = input.metric ?? 'count';
  const groupBy = input.groupBy ?? 'none';
  if (typeof metric !== 'string' || !METRICS.includes(metric as Metric)) return { ok: false, error: `Unknown metric: ${String(metric)}` };
  if (typeof groupBy !== 'string' || !GROUPS.includes(groupBy as GroupBy)) return { ok: false, error: `Unknown grouping: ${String(groupBy)}` };

  const filtersIn = input.filters ?? {};
  if (!isRecord(filtersIn)) return { ok: false, error: 'Filters must be an object.' };
  const districts = idList(filtersIn.districts, DISTRICT_IDS, 'district');
  const categories = idList(filtersIn.categories, CATEGORY_IDS, 'category');
  const statuses = idList(filtersIn.statuses, STATUS_IDS, 'status');
  for (const r of [districts, categories, statuses]) if (r instanceof Error) return { ok: false, error: r.message };

  const filters: QueryPlan['filters'] = {};
  if (districts) filters.districts = districts as string[];
  if (categories) filters.categories = categories as string[];
  if (statuses) filters.statuses = statuses as string[];
  for (const key of ['from', 'to'] as const) {
    const v = filtersIn[key];
    if (v === undefined || v === null) continue;
    if (typeof v !== 'string' || monthIndex(v) === null) return { ok: false, error: `Date outside the data (Jan 2025 to Jun 2026): ${String(v)}` };
    filters[key] = v;
  }
  if (filters.from && filters.to && filters.from > filters.to) [filters.from, filters.to] = [filters.to, filters.from];

  const plan: QueryPlan = { metric: metric as Metric, groupBy: groupBy as GroupBy, filters };
  if (input.sort === 'asc' || input.sort === 'desc') plan.sort = input.sort;
  if (typeof input.limit === 'number' && Number.isFinite(input.limit)) plan.limit = Math.max(1, Math.min(MAX_LIMIT, Math.round(input.limit)));
  if (typeof input.chart === 'string' && CHARTS.includes(input.chart as ChartKind)) plan.chart = input.chart as ChartKind;
  return { ok: true, plan };
}
