import { describe, expect, it } from 'vitest';
import { generateDataset } from './generate';
import { CATEGORIES, DISTRICTS, MONTH_COUNT } from './meta';

describe('generateDataset', () => {
  const ds = generateDataset(24000);

  it('is deterministic for a given seed', () => {
    const again = generateDataset(24000);
    expect(Array.from(again.district.slice(0, 50))).toEqual(Array.from(ds.district.slice(0, 50)));
    expect(again.resolutionDays[100]).toBe(ds.resolutionDays[100]);
  });

  it('keeps every value inside its valid range', () => {
    for (let i = 0; i < ds.n; i++) {
      expect(ds.district[i]).toBeLessThan(DISTRICTS.length);
      expect(ds.category[i]).toBeLessThan(CATEGORIES.length);
      expect(ds.month[i]).toBeLessThan(MONTH_COUNT);
      expect(ds.status[i]).toBeLessThanOrEqual(2);
    }
  });

  it('only gives a resolution time to resolved complaints', () => {
    for (let i = 0; i < ds.n; i++) {
      if (ds.status[i] === 0) expect(ds.resolutionDays[i]).toBeGreaterThan(0);
      else expect(ds.resolutionDays[i]).toBe(-1);
    }
  });

  it('makes the biggest city the biggest source of complaints', () => {
    const counts = new Array(DISTRICTS.length).fill(0);
    for (let i = 0; i < ds.n; i++) counts[ds.district[i]]++;
    expect(counts.indexOf(Math.max(...counts))).toBe(0);
  });
});
