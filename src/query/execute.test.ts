import { describe, expect, it } from 'vitest';
import type { Dataset } from '../data/generate';
import { execute } from './execute';

// Six hand-made rows so every expected number can be checked by eye.
// district 0 = Bengaluru Urban, 2 = Mysuru; category 0 = water, 2 = electricity; month 0 = Jan 2025, 1 = Feb 2025
const ds: Dataset = {
  n: 6,
  district: Uint8Array.from([0, 0, 0, 2, 2, 2]),
  category: Uint8Array.from([0, 0, 2, 0, 2, 2]),
  status: Uint8Array.from([0, 0, 2, 0, 1, 0]),
  month: Uint8Array.from([0, 1, 1, 0, 1, 1]),
  resolutionDays: Int16Array.from([4, 8, -1, 6, -1, 2]),
};
const base = { metric: 'count', groupBy: 'none', filters: {} } as const;

describe('execute', () => {
  it('counts all rows when nothing is filtered', () => {
    expect(execute({ ...base }, ds).total).toEqual({ value: 6, count: 6 });
  });

  it('groups and ranks by count', () => {
    const r = execute({ ...base, groupBy: 'category' }, ds);
    expect(r.rows.map(x => [x.key, x.value])).toEqual([['water', 3], ['electricity', 3]]);
  });

  it('filters by district and category together', () => {
    const r = execute({ ...base, filters: { districts: ['bengaluru-urban'], categories: ['water'] } }, ds);
    expect(r.total.count).toBe(2);
  });

  it('averages resolution days over resolved complaints only', () => {
    const r = execute({ metric: 'avg_resolution_days', groupBy: 'district', filters: {} }, ds);
    const byKey = Object.fromEntries(r.rows.map(x => [x.key, x.value]));
    expect(byKey['bengaluru-urban']).toBe(6); // (4 + 8) / 2
    expect(byKey['mysuru']).toBe(4); // (6 + 2) / 2
  });

  it('computes the resolution rate as a percentage', () => {
    const r = execute({ metric: 'resolution_rate', groupBy: 'district', filters: {} }, ds);
    const byKey = Object.fromEntries(r.rows.map(x => [x.key, x.value]));
    expect(byKey['bengaluru-urban']).toBe(66.7);
    expect(byKey['mysuru']).toBe(66.7);
  });

  it('orders months in time and respects the date window', () => {
    const r = execute({ ...base, groupBy: 'month', filters: { from: '2025-02', to: '2025-02' } }, ds);
    expect(r.rows.map(x => x.label)).toEqual(['Feb 2025']);
    expect(r.chart).toBe('line');
  });

  it('filters by status', () => {
    expect(execute({ ...base, filters: { statuses: ['open', 'in-progress'] } }, ds).total.count).toBe(2);
  });

  it('applies ascending order and a limit', () => {
    const r = execute({ ...base, groupBy: 'district', sort: 'asc', limit: 1 }, ds);
    expect(r.rows).toHaveLength(1);
  });

  it('uses a map only when grouped by district', () => {
    expect(execute({ ...base, groupBy: 'district', chart: 'map' }, ds).chart).toBe('map');
    expect(execute({ ...base, groupBy: 'category', chart: 'map' }, ds).chart).toBe('bar');
    expect(execute({ ...base }, ds).chart).toBe('number');
  });

  it('attaches coordinates to district rows', () => {
    const r = execute({ ...base, groupBy: 'district' }, ds);
    expect(r.rows[0].lat).toBeTypeOf('number');
  });
});
