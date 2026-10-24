import type { Dataset } from '../data/generate';
import { execute } from './execute';
import { parseOffline } from './offlineParser';
import type { QueryPlan, QueryResult } from './types';
import { interpret, SarvamError, type SarvamModel } from '../sarvam/client';

export type Source = 'sarvam' | 'offline' | 'cache';

export interface Answer {
  id: number;
  question: string;
  source: Source;
  /** What each stage cost, so the cost of understanding vs. computing is visible. */
  understandMs: number;
  result: QueryResult;
  matched?: string[];
  /** Set when Sarvam failed and the local parser answered instead. */
  notice?: string;
  model?: string;
}

export type Outcome =
  | { kind: 'answer'; answer: Answer }
  | { kind: 'unanswerable'; question: string; message: string }
  | { kind: 'queued'; question: string }
  | { kind: 'error'; question: string; message: string };

export interface AskDeps {
  data: Dataset;
  online: boolean;
  apiKey: string;
  useSarvam: boolean;
  model: SarvamModel;
  signal?: AbortSignal;
  getCached: (q: string) => Promise<QueryPlan | undefined>;
  setCached: (q: string, p: QueryPlan) => Promise<void>;
  interpretImpl?: typeof interpret;
  nextId: () => number;
}

const CONFIDENCE_FLOOR = 0.3;

/**
 * Local-first decision tree. A repeated question is answered from cache. With a key and a connection, Sarvam
 * reads it. Otherwise the local parser does, and a question neither can read while offline is queued for later.
 */
export async function ask(question: string, deps: AskDeps): Promise<Outcome> {
  const run = (plan: QueryPlan, source: Source, understandMs: number, extra: Partial<Answer> = {}): Outcome => ({
    kind: 'answer',
    answer: { id: deps.nextId(), question, source, understandMs, result: execute(plan, deps.data), ...extra },
  });

  const cached = await deps.getCached(question);
  if (cached) return run(cached, 'cache', 0);

  let notice: string | undefined;
  const wantSarvam = deps.useSarvam && deps.apiKey && deps.online;
  if (wantSarvam) {
    try {
      const out = await (deps.interpretImpl ?? interpret)(question, { apiKey: deps.apiKey, model: deps.model, signal: deps.signal });
      if ('unanswerable' in out) return { kind: 'unanswerable', question, message: out.unanswerable };
      await deps.setCached(question, out.plan);
      return run(out.plan, 'sarvam', out.ms, { model: deps.model });
    } catch (e) {
      if (deps.signal?.aborted) throw e;
      notice = e instanceof SarvamError ? e.message : 'Sarvam could not be used.';
    }
  }

  const local = parseOffline(question);
  if (local.confidence >= CONFIDENCE_FLOOR) {
    const t0 = performance.now();
    return run(local.plan, 'offline', performance.now() - t0, { matched: local.matched, notice: notice ? `${notice} Answered with the offline parser.` : undefined });
  }
  if (!deps.online) return { kind: 'queued', question };
  return {
    kind: 'error',
    question,
    message: notice ?? 'I could not read that question offline. Add a Sarvam API key in Settings for open-ended questions, or try one of the examples.',
  };
}
