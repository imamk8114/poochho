import { describe, expect, it, vi } from 'vitest';
import { extractJson, interpret, SarvamError } from './client';

const reply = (content: string | null, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
const opts = (fetchImpl: unknown) => ({ apiKey: 'sk_test_key', fetchImpl: fetchImpl as typeof fetch });

describe('extractJson', () => {
  it('finds the object inside reasoning text and code fences', () => {
    expect(extractJson('Let me think... ```json\n{"a": {"b": "}"}}\n``` done')).toEqual({ a: { b: '}' } });
  });
  it('rejects text with no object, truncated and malformed objects', () => {
    expect(() => extractJson('no json here')).toThrow(SarvamError);
    expect(() => extractJson('{"a": 1')).toThrow(/incomplete/);
    expect(() => extractJson('{a: 1}')).toThrow(/malformed/);
  });
});

describe('interpret', () => {
  it('returns a validated plan and sends both auth headers', async () => {
    const fetchImpl = vi.fn(async () => reply('{"metric":"count","groupBy":"district","filters":{"categories":["water"]},"limit":5}'));
    const out = await interpret('top water districts', opts(fetchImpl));
    expect('plan' in out && out.plan.filters.categories).toEqual(['water']);
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    const headers = init.headers as Record<string, string>;
    expect(headers['api-subscription-key']).toBe('sk_test_key');
    expect(headers.authorization).toBe('Bearer sk_test_key');
    const body = JSON.parse(init.body as string);
    expect(body.temperature).toBe(0);
    expect(body.messages[1]).toEqual({ role: 'user', content: 'top water districts' });
  });

  it('passes through a model that says the question cannot be answered', async () => {
    const out = await interpret('weather tomorrow?', opts(vi.fn(async () => reply('{"error":"Not in this data."}'))));
    expect(out).toMatchObject({ unanswerable: 'Not in this data.' });
  });

  it('refuses a plan with an invented district', async () => {
    const f = vi.fn(async () => reply('{"filters":{"districts":["atlantis"]}}'));
    await expect(interpret('q', opts(f))).rejects.toThrow(/Unknown district/);
  });

  it('maps HTTP errors to plain messages', async () => {
    await expect(interpret('q', opts(vi.fn(async () => new Response('{}', { status: 401 }))))).rejects.toThrow(/key/);
    await expect(interpret('q', opts(vi.fn(async () => new Response('{}', { status: 429 }))))).rejects.toThrow(/quota/);
  });

  it('reports an empty reply and a network failure without leaking the key', async () => {
    await expect(interpret('q', opts(vi.fn(async () => reply(null))))).rejects.toThrow(/empty/);
    const err = await interpret('q', opts(vi.fn(async () => { throw new TypeError('Failed to fetch'); }))).catch(e => e);
    expect(err.message).toMatch(/offline/);
    expect(err.message).not.toContain('sk_test_key');
  });
});
