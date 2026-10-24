import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { cachePlan, dequeue, enqueue, getCachedPlan, listQueue } from './storage';

describe('plan cache', () => {
  it('matches a repeated question regardless of case and spacing', async () => {
    const plan = { metric: 'count', groupBy: 'none', filters: {} } as const;
    await cachePlan('  Water   in Mysuru ', plan);
    expect(await getCachedPlan('water in mysuru')).toEqual(plan);
    expect(await getCachedPlan('something else')).toBeUndefined();
  });
});

describe('offline queue', () => {
  it('stores questions in order and removes them once answered', async () => {
    await enqueue('first');
    await enqueue('second');
    const items = await listQueue();
    expect(items.map(i => i.question)).toEqual(['first', 'second']);
    await dequeue(items[0].id);
    expect((await listQueue()).map(i => i.question)).toEqual(['second']);
  });
});
