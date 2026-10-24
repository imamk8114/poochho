import { CATEGORIES, DISTRICTS, MONTH_COUNT, STATUSES, monthIndex, monthLabel } from '../data/meta';
import type { Dataset } from '../data/generate';
import type { QueryPlan, QueryResult, ResultRow } from './types';

const STATUS_INDEX: Record<string, number> = { resolved: 0, 'in-progress': 1, open: 2 };

function groupMeta(plan: QueryPlan): { size: number; label: (k: number) => string; id: (k: number) => string } {
  switch (plan.groupBy) {
    case 'district': return { size: DISTRICTS.length, label: k => DISTRICTS[k].name, id: k => DISTRICTS[k].id };
    case 'category': return { size: CATEGORIES.length, label: k => CATEGORIES[k].name, id: k => CATEGORIES[k].id };
    case 'status': return { size: STATUSES.length, label: k => STATUSES[k].name, id: k => STATUSES[k].id };
    case 'month': return { size: MONTH_COUNT, label: k => monthLabel(k), id: k => String(k) };
    default: return { size: 1, label: () => 'All complaints', id: () => 'all' };
  }
}

function lookup(ids: string[] | undefined, all: { id: string }[]): Uint8Array | null {
  if (!ids) return null;
  const mask = new Uint8Array(all.length);
  all.forEach((a, i) => { if (ids.includes(a.id)) mask[i] = 1; });
  return mask;
}

/** Runs a validated plan against the columnar dataset in a single pass. */
export function execute(plan: QueryPlan, ds: Dataset): QueryResult {
  const t0 = performance.now();
  const dMask = lookup(plan.filters.districts, DISTRICTS);
  const cMask = lookup(plan.filters.categories, CATEGORIES);
  const sMask = plan.filters.statuses ? Uint8Array.from([0, 1, 2].map(i => (plan.filters.statuses!.some(s => STATUS_INDEX[s] === i) ? 1 : 0))) : null;
  const from = plan.filters.from ? monthIndex(plan.filters.from)! : 0;
  const to = plan.filters.to ? monthIndex(plan.filters.to)! : MONTH_COUNT - 1;

  const g = groupMeta(plan);
  const count = new Float64Array(g.size);
  const resolved = new Float64Array(g.size);
  const daysSum = new Float64Array(g.size);
  const daysN = new Float64Array(g.size);
  let tCount = 0, tResolved = 0, tDays = 0, tDaysN = 0;

  for (let i = 0; i < ds.n; i++) {
    const m = ds.month[i];
    if (m < from || m > to) continue;
    if (dMask && !dMask[ds.district[i]]) continue;
    if (cMask && !cMask[ds.category[i]]) continue;
    if (sMask && !sMask[ds.status[i]]) continue;
    const k = plan.groupBy === 'district' ? ds.district[i]
      : plan.groupBy === 'category' ? ds.category[i]
      : plan.groupBy === 'status' ? ds.status[i]
      : plan.groupBy === 'month' ? m : 0;
    count[k]++; tCount++;
    if (ds.status[i] === 0) { resolved[k]++; tResolved++; }
    const d = ds.resolutionDays[i];
    if (d >= 0) { daysSum[k] += d; daysN[k]++; tDays += d; tDaysN++; }
  }

  const value = (c: number, r: number, s: number, sn: number): number | null =>
    plan.metric === 'count' ? c
      : plan.metric === 'resolution_rate' ? (c ? (r / c) * 100 : null)
      : (sn ? s / sn : null);

  let rows: ResultRow[] = [];
  for (let k = 0; k < g.size; k++) {
    if (!count[k]) continue;
    const v = value(count[k], resolved[k], daysSum[k], daysN[k]);
    if (v === null) continue;
    const row: ResultRow = { key: g.id(k), label: g.label(k), value: Math.round(v * 10) / 10, count: count[k] };
    if (plan.groupBy === 'district') { row.lat = DISTRICTS[k].lat; row.lon = DISTRICTS[k].lon; }
    rows.push(row);
  }
  // Months read left to right in time; everything else ranks by value.
  if (plan.groupBy !== 'month') rows.sort((a, b) => (plan.sort === 'asc' ? a.value - b.value : b.value - a.value));
  if (plan.limit) rows = plan.groupBy === 'month' ? rows.slice(-plan.limit) : rows.slice(0, plan.limit);

  const tv = value(tCount, tResolved, tDays, tDaysN) ?? 0;
  const want = plan.chart ?? 'auto';
  const chart: QueryResult['chart'] = plan.groupBy === 'none' ? 'number'
    : want === 'map' && plan.groupBy === 'district' ? 'map'
    : plan.groupBy === 'month' ? 'line'
    : 'bar';
  return { plan, rows, total: { value: Math.round(tv * 10) / 10, count: tCount }, chart, ms: performance.now() - t0 };
}
