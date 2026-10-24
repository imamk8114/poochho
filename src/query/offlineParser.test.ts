import { describe, expect, it } from 'vitest';
import { parseOffline } from './offlineParser';

const plan = (q: string) => parseOffline(q).plan;

describe('parseOffline: English', () => {
  it('ranks districts for a category', () => {
    expect(plan('Which 5 districts have the most water complaints?')).toMatchObject({ metric: 'count', groupBy: 'district', filters: { categories: ['water'] }, sort: 'desc', limit: 5 });
  });

  it('reads a named district as a filter, not a grouping', () => {
    expect(plan('How many road complaints in Mysuru?')).toMatchObject({ groupBy: 'none', filters: { districts: ['mysuru'], categories: ['roads'] } });
  });

  it('understands old and new district names', () => {
    expect(plan('complaints in Bangalore').filters.districts).toEqual(['bengaluru-urban']);
    expect(plan('complaints in Belgaum').filters.districts).toEqual(['belagavi']);
  });

  it('does not confuse "Bengaluru Rural" with "Bengaluru"', () => {
    expect(plan('garbage complaints in Bengaluru Rural').filters.districts).toEqual(['bengaluru-rural']);
  });

  it('reads average resolution time', () => {
    expect(plan('average resolution time by category')).toMatchObject({ metric: 'avg_resolution_days', groupBy: 'category' });
  });

  it('reads a resolution rate', () => {
    expect(plan('what percentage resolved by district').metric).toBe('resolution_rate');
  });

  it('reads a trend over a window', () => {
    expect(plan('electricity complaints by month for the last 6 months')).toMatchObject({ groupBy: 'month', filters: { categories: ['electricity'], from: '2026-01', to: '2026-06' } });
  });

  it('reads "last month" and a status', () => {
    expect(plan('open complaints last month').filters).toMatchObject({ statuses: ['open'], from: '2026-06', to: '2026-06' });
  });

  it('turns a map request into a district map', () => {
    expect(plan('show a map of garbage complaints')).toMatchObject({ groupBy: 'district', chart: 'map' });
  });
});

describe('parseOffline: Hindi', () => {
  it('reads Devanagari categories and districts', () => {
    expect(plan('मैसूर में बिजली की शिकायतें कितनी हैं')).toMatchObject({ filters: { districts: ['mysuru'], categories: ['electricity'] } });
  });

  it('reads "last 3 months by month"', () => {
    expect(plan('पिछले 3 महीने में पानी की शिकायतें महीने के हिसाब से')).toMatchObject({ groupBy: 'month', filters: { categories: ['water'], from: '2026-04', to: '2026-06' } });
  });

  it('reads romanised Hindi', () => {
    expect(plan('kachra ki shikayatein zila ke hisab se')).toMatchObject({ groupBy: 'district', filters: { categories: ['garbage'] } });
  });

  it('reads average days', () => {
    expect(plan('सड़क की शिकायतें औसत दिन')).toMatchObject({ metric: 'avg_resolution_days', filters: { categories: ['roads'] } });
  });
});

describe('parseOffline: Kannada', () => {
  it('reads Kannada district and category', () => {
    expect(plan('ಮೈಸೂರು ನೀರು ದೂರುಗಳು')).toMatchObject({ filters: { districts: ['mysuru'], categories: ['water'] } });
  });
});

describe('parseOffline: confidence', () => {
  it('has zero confidence when nothing is recognised, so the caller does not guess', () => {
    expect(parseOffline('what is the meaning of life').confidence).toBe(0);
    expect(parseOffline('').confidence).toBe(0);
  });

  it('is higher the more it recognised', () => {
    expect(parseOffline('water complaints by district').confidence).toBeGreaterThan(parseOffline('water').confidence);
  });

  it('lists what it matched so the user can check the reading', () => {
    expect(parseOffline('water complaints in mysuru').matched.join(' ')).toMatch(/mysuru/);
  });
});
