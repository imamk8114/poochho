import { CATEGORIES, DISTRICTS, FIRST_MONTH, LAST_MONTH, STATUSES } from '../data/meta';
import { validatePlan } from '../query/validate';
import type { QueryPlan } from '../query/types';

const ENDPOINT = 'https://api.sarvam.ai/v1/chat/completions';
// "conversations" is the low-latency model Sarvam recommends for real-time use; "sarvam-105b" is the larger one.
export const MODELS = ['sarvam-105b-conversations', 'sarvam-105b'] as const;
export type SarvamModel = (typeof MODELS)[number];
const TIMEOUT_MS = 12000;

export class SarvamError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

const friendly = (status: number): string => {
  if (status === 401 || status === 403) return 'Sarvam rejected the API key. Check it and try again.';
  if (status === 429) return 'Sarvam rate limit or quota reached.';
  if (status >= 500) return 'Sarvam is having trouble right now.';
  return `Sarvam request failed (HTTP ${status}).`;
};

export function systemPrompt(): string {
  return `You turn a question about a dataset of public-service complaints in Karnataka into a JSON query plan.
The question may be in English, Hindi, Kannada or another Indian language, and may mix them.

Reply with ONLY one JSON object, no prose, no code fences:
{
  "metric": "count" | "avg_resolution_days" | "resolution_rate",
  "groupBy": "district" | "category" | "status" | "month" | "none",
  "filters": {
    "districts": [district ids],
    "categories": [category ids],
    "statuses": [status ids],
    "from": "YYYY-MM",
    "to": "YYYY-MM"
  },
  "sort": "desc" | "asc",
  "limit": number,
  "chart": "auto" | "bar" | "line" | "map"
}
Leave out any filter or field that the question does not ask for.

Allowed values (use the ids exactly):
- districts: ${DISTRICTS.map(d => `${d.id} (${d.name})`).join(', ')}
- categories: ${CATEGORIES.map(c => `${c.id} (${c.name})`).join(', ')}
- statuses: ${STATUSES.map(s => `${s.id}`).join(', ')}
- The data covers ${FIRST_MONTH} to ${LAST_MONTH}. "Last month" means ${LAST_MONTH}.
- "resolution_rate" is the percentage of complaints resolved. "avg_resolution_days" is the mean days to resolve.
- Use chart "map" only with groupBy "district". Use groupBy "month" for trends over time.

If the question cannot be answered from this data, reply {"error": "<one short sentence in the language of the question>"}.

Examples:
Q: Which 5 districts have the most water complaints?
A: {"metric":"count","groupBy":"district","filters":{"categories":["water"]},"sort":"desc","limit":5}
Q: पिछले 3 महीनों में बिजली की शिकायतें महीने के हिसाब से दिखाओ
A: {"metric":"count","groupBy":"month","filters":{"categories":["electricity"],"from":"2026-04","to":"2026-06"}}`;
}

/** Pulls the first balanced {...} out of a reply, ignoring any reasoning text or fences around it. */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  if (start === -1) throw new SarvamError('The model did not return a query.');
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        throw new SarvamError('The model returned malformed JSON.');
      }
    }
  }
  throw new SarvamError('The model returned incomplete JSON.');
}

export interface InterpretOptions {
  apiKey: string;
  model?: SarvamModel;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

export type Interpretation = { plan: QueryPlan; ms: number } | { unanswerable: string; ms: number };

/**
 * Asks Sarvam to read a question. The reply is untrusted: it is parsed and checked against the closed plan
 * shape, and anything outside it (an invented district, a bad date) is rejected, never executed.
 */
export async function interpret(question: string, { apiKey, model = MODELS[0], signal, fetchImpl = fetch }: InterpretOptions): Promise<Interpretation> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS);
  const onAbort = () => timeout.abort();
  signal?.addEventListener('abort', onAbort);
  const t0 = performance.now();
  let response: Response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      signal: timeout.signal,
      headers: {
        'content-type': 'application/json',
        // The docs list both headers; sending both works whichever the gateway checks.
        'api-subscription-key': apiKey,
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 600,
        reasoning_effort: 'low',
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: systemPrompt() }, { role: 'user', content: question }],
      }),
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new SarvamError(timeout.signal.aborted ? 'Sarvam took too long to answer.' : 'Could not reach Sarvam. You may be offline.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
  if (!response.ok) throw new SarvamError(friendly(response.status), response.status);
  const body = (await response.json()) as { choices?: { message?: { content?: string | null } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new SarvamError('Sarvam returned an empty answer.');
  const parsed = extractJson(content) as Record<string, unknown>;
  const ms = performance.now() - t0;
  if (typeof parsed.error === 'string') return { unanswerable: parsed.error, ms };
  const checked = validatePlan(parsed);
  if (!checked.ok) throw new SarvamError(checked.error);
  return { plan: checked.plan, ms };
}
