import { describe, expect, it } from 'vitest';
import { validatePlan } from './validate';

describe('validatePlan', () => {
  it('accepts a minimal plan and fills defaults', () => {
    const v = validatePlan({});
    expect(v.ok && v.plan).toEqual({ metric: 'count', groupBy: 'none', filters: {} });
  });

  it('accepts a full valid plan', () => {
    const v = validatePlan({ metric: 'avg_resolution_days', groupBy: 'district', filters: { categories: ['water'], from: '2025-03', to: '2025-09' }, sort: 'desc', limit: 5, chart: 'map' });
    expect(v.ok).toBe(true);
  });

  it('rejects an invented district rather than answering a different question', () => {
    const v = validatePlan({ filters: { districts: ['atlantis'] } });
    expect(v.ok).toBe(false);
  });

  it('rejects unknown metrics and groupings', () => {
    expect(validatePlan({ metric: 'median' }).ok).toBe(false);
    expect(validatePlan({ groupBy: 'ward' }).ok).toBe(false);
  });

  it('rejects dates outside the data', () => {
    expect(validatePlan({ filters: { from: '2019-01' } }).ok).toBe(false);
    expect(validatePlan({ filters: { to: 'last month' } }).ok).toBe(false);
  });

  it('swaps a reversed date range', () => {
    const v = validatePlan({ filters: { from: '2025-09', to: '2025-03' } });
    expect(v.ok && v.plan.filters).toEqual({ from: '2025-03', to: '2025-09' });
  });

  it('clamps the limit and ignores junk fields', () => {
    const v = validatePlan({ limit: 9999, chart: 'pie', evil: 'drop table' });
    expect(v.ok && v.plan.limit).toBe(30);
    expect(v.ok && 'evil' in v.plan).toBe(false);
    expect(v.ok && v.plan.chart).toBeUndefined();
  });

  it('rejects non-objects', () => {
    expect(validatePlan('hello').ok).toBe(false);
    expect(validatePlan(null).ok).toBe(false);
    expect(validatePlan([]).ok).toBe(false);
  });
});
