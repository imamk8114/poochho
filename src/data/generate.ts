import { CATEGORIES, DATASET_SIZE, DISTRICTS, MONTH_COUNT } from './meta';

/**
 * Complaints stored as parallel typed arrays rather than an array of objects: one pass over a few
 * contiguous buffers keeps aggregation fast and memory small on low-end devices.
 */
export interface Dataset {
  n: number;
  district: Uint8Array;
  category: Uint8Array;
  /** 0 resolved, 1 in progress, 2 open. */
  status: Uint8Array;
  month: Uint8Array;
  /** Days to resolve, or -1 when not resolved. */
  resolutionDays: Int16Array;
}

/** Small seeded PRNG so every visitor, and every test run, sees the same data. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cumulative(weights: number[]): number[] {
  let sum = 0;
  return weights.map(w => (sum += w));
}

function pick(cum: number[], r: number): number {
  const x = r * cum[cum.length - 1];
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// Months run from index 0 (Jan 2025). Water complaints peak in the dry months, roads in the monsoon.
const seasonal = (categoryId: string, monthOfYear: number): number => {
  if (categoryId === 'water') return monthOfYear >= 2 && monthOfYear <= 4 ? 1.9 : 0.8;
  if (categoryId === 'roads') return monthOfYear >= 6 && monthOfYear <= 8 ? 2.1 : 0.8;
  if (categoryId === 'electricity') return monthOfYear >= 3 && monthOfYear <= 5 ? 1.5 : 0.9;
  return 1;
};

export function generateDataset(n = DATASET_SIZE, seed = 20250101): Dataset {
  const rand = mulberry32(seed);
  const normal = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
  const districtCum = cumulative(DISTRICTS.map(d => d.weight));
  const ds: Dataset = {
    n,
    district: new Uint8Array(n),
    category: new Uint8Array(n),
    status: new Uint8Array(n),
    month: new Uint8Array(n),
    resolutionDays: new Int16Array(n).fill(-1),
  };
  const totalDays = MONTH_COUNT * 30;

  for (let i = 0; i < n; i++) {
    const d = pick(districtCum, rand());
    const urban = d === 0 || d === 2 || d === 5;
    // Cities report more garbage and transport issues; rural districts more water and roads.
    const catWeights = CATEGORIES.map(c => {
      if (urban) return c.id === 'garbage' || c.id === 'transport' || c.id === 'street-lights' ? 1.5 : 1;
      return c.id === 'water' || c.id === 'roads' ? 1.6 : 0.8;
    });
    // Pick the day first, then bias the category by that month's season.
    const day = Math.floor(rand() * totalDays);
    const month = Math.min(MONTH_COUNT - 1, Math.floor(day / 30));
    const seasonWeights = catWeights.map((w, k) => w * seasonal(CATEGORIES[k].id, month % 12));
    const c = pick(cumulative(seasonWeights), rand());

    // Remote districts are slower to fix things; cities are faster.
    const speed = urban ? 0.8 : 1.25;
    const days = Math.max(1, Math.min(90, Math.round(CATEGORIES[c].baseDays * speed * Math.exp(0.45 * normal()))));
    const daysLeft = totalDays - day;
    const r = rand();
    // Recent complaints cannot have been resolved yet if their resolution time runs past the data end.
    let status = r < 0.74 ? 0 : r < 0.9 ? 1 : 2;
    if (status === 0 && days > daysLeft) status = rand() < 0.6 ? 1 : 2;

    ds.district[i] = d;
    ds.category[i] = c;
    ds.status[i] = status;
    ds.month[i] = month;
    if (status === 0) ds.resolutionDays[i] = days;
  }
  return ds;
}
