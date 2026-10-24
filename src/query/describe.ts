import { CATEGORIES, DISTRICTS, STATUSES, monthLabel, monthIndex } from '../data/meta';
import type { Metric, QueryPlan } from './types';

export const METRIC_UNIT: Record<Metric, string> = { count: 'complaints', avg_resolution_days: 'days', resolution_rate: '% resolved' };
const METRIC_NAME: Record<Metric, string> = { count: 'Number of complaints', avg_resolution_days: 'Average days to resolve', resolution_rate: 'Resolution rate' };

const names = (ids: string[], all: { id: string; name: string }[]) => ids.map(id => all.find(a => a.id === id)?.name ?? id).join(', ');

/** The plan as short chips, shown beside every answer so the reading of the question can be checked. */
export function planChips(plan: QueryPlan): string[] {
  const chips = [METRIC_NAME[plan.metric]];
  if (plan.groupBy !== 'none') chips.push(`by ${plan.groupBy}`);
  const f = plan.filters;
  if (f.districts) chips.push(`district: ${names(f.districts, DISTRICTS)}`);
  if (f.categories) chips.push(`category: ${names(f.categories, CATEGORIES)}`);
  if (f.statuses) chips.push(`status: ${names(f.statuses, [...STATUSES])}`);
  if (f.from || f.to) {
    const a = f.from ? monthLabel(monthIndex(f.from) ?? 0) : 'Jan 2025';
    const b = f.to ? monthLabel(monthIndex(f.to) ?? 0) : 'Jun 2026';
    chips.push(a === b ? a : `${a} to ${b}`);
  }
  if (plan.chart === 'map') chips.push('map');
  if (plan.limit) chips.push(`${plan.sort === 'asc' ? 'lowest' : 'top'} ${plan.limit}`);
  return chips;
}
