import { describe, expect, it, vi } from 'vitest';
import { generateDataset } from '../data/generate';
import { SarvamError } from '../sarvam/client';
import { ask, type AskDeps } from './ask';
import type { QueryPlan } from './types';

const data = generateDataset(2000);
let id = 0;
const plan: QueryPlan = { metric: 'count', groupBy: 'category', filters: {} };

function deps(over: Partial<AskDeps> = {}): AskDeps {
  return {
    data, online: true, apiKey: '', useSarvam: true, model: 'sarvam-105b-conversations',
    getCached: async () => undefined, setCached: async () => {}, nextId: () => ++id, ...over,
  };
}

describe('ask', () => {
  it('uses the local parser when there is no key', async () => {
    const out = await ask('water complaints by district', deps());
    expect(out.kind === 'answer' && out.answer.source).toBe('offline');
  });

  it('uses Sarvam when it has a key and a connection, and caches the plan', async () => {
    const setCached = vi.fn(async () => {});
    const interpretImpl = vi.fn(async () => ({ plan, ms: 120 }));
    const out = await ask('anything', deps({ apiKey: 'k', interpretImpl: interpretImpl as never, setCached }));
    expect(out.kind === 'answer' && out.answer.source).toBe('sarvam');
    expect(setCached).toHaveBeenCalledWith('anything', plan);
  });

  it('answers a repeated question from cache without calling Sarvam', async () => {
    const interpretImpl = vi.fn();
    const out = await ask('seen before', deps({ apiKey: 'k', getCached: async () => plan, interpretImpl: interpretImpl as never }));
    expect(out.kind === 'answer' && out.answer.source).toBe('cache');
    expect(interpretImpl).not.toHaveBeenCalled();
  });

  it('works offline for a cached question even with a key', async () => {
    const out = await ask('seen before', deps({ online: false, apiKey: 'k', getCached: async () => plan }));
    expect(out.kind === 'answer' && out.answer.source).toBe('cache');
  });

  it('falls back to the local parser, with a notice, when Sarvam fails', async () => {
    const interpretImpl = vi.fn(async () => { throw new SarvamError('Sarvam rate limit or quota reached.', 429); });
    const out = await ask('water complaints by district', deps({ apiKey: 'k', interpretImpl: interpretImpl as never }));
    expect(out.kind === 'answer' && out.answer.source).toBe('offline');
    expect(out.kind === 'answer' && out.answer.notice).toMatch(/quota/);
  });

  it('does not call Sarvam while offline, even with a key', async () => {
    const interpretImpl = vi.fn();
    const out = await ask('water complaints by district', deps({ online: false, apiKey: 'k', interpretImpl: interpretImpl as never }));
    expect(interpretImpl).not.toHaveBeenCalled();
    expect(out.kind).toBe('answer');
  });

  it('queues a question nothing can read while offline', async () => {
    const out = await ask('what is the meaning of life', deps({ online: false }));
    expect(out.kind).toBe('queued');
  });

  it('explains how to proceed when online but unreadable and no key', async () => {
    const out = await ask('what is the meaning of life', deps());
    expect(out.kind === 'error' && out.message).toMatch(/API key/);
  });

  it('relays a question the model says is not answerable', async () => {
    const interpretImpl = vi.fn(async () => ({ unanswerable: 'Not in this data.', ms: 5 }));
    const out = await ask('weather?', deps({ apiKey: 'k', interpretImpl: interpretImpl as never }));
    expect(out).toMatchObject({ kind: 'unanswerable', message: 'Not in this data.' });
  });

  it('skips Sarvam when the user turned it off', async () => {
    const interpretImpl = vi.fn();
    await ask('water by district', deps({ apiKey: 'k', useSarvam: false, interpretImpl: interpretImpl as never }));
    expect(interpretImpl).not.toHaveBeenCalled();
  });
});
