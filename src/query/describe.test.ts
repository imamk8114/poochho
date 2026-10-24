import { describe, expect, it } from 'vitest';
import { planChips } from './describe';

describe('planChips', () => {
  it('describes a plan in plain words', () => {
    expect(planChips({ metric: 'avg_resolution_days', groupBy: 'district', filters: { categories: ['water'], from: '2026-01', to: '2026-03' }, sort: 'desc', limit: 5 })).toEqual([
      'Average days to resolve', 'by district', 'category: Water supply', 'Jan 2026 to Mar 2026', 'top 5',
    ]);
  });
  it('shows a single month once', () => {
    expect(planChips({ metric: 'count', groupBy: 'none', filters: { from: '2026-06', to: '2026-06' } })).toContain('Jun 2026');
  });
});
