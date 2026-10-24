import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnswerCard } from './components/AnswerCard';
import { AskBar } from './components/AskBar';
import { Settings } from './components/Settings';
import { StatusBar } from './components/StatusBar';
import { generateDataset } from './data/generate';
import { cachePlan, dequeue, enqueue, getCachedPlan, listQueue } from './offline/storage';
import { ask, type AskDeps, type Outcome } from './query/ask';
import { useStore } from './store';

export function App() {
  const data = useMemo(() => generateDataset(), []);
  const [question, setQuestion] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const store = useStore();
  const { answers, busy, notice, setBusy, setNotice, addAnswer, setQueued, setOnline } = store;

  const deps = useCallback((signal?: AbortSignal): AskDeps => {
    const s = useStore.getState();
    return { data, online: s.online, apiKey: s.apiKey, useSarvam: s.useSarvam, model: s.model, signal, getCached: getCachedPlan, setCached: cachePlan, nextId: () => ++idRef.current };
  }, [data]);

  const refreshQueue = useCallback(async () => setQueued((await listQueue()).length), [setQueued]);

  const handle = useCallback(async (outcome: Outcome) => {
    if (outcome.kind === 'answer') { addAnswer(outcome.answer); setNotice(null); }
    else if (outcome.kind === 'queued') {
      await enqueue(outcome.question); await refreshQueue();
      setNotice({ kind: 'info', text: 'You are offline and I could not read that question without Sarvam. It is saved and will be answered when you are back online with a key set.' });
    } else if (outcome.kind === 'unanswerable') setNotice({ kind: 'info', text: outcome.message });
    else setNotice({ kind: 'error', text: outcome.message });
  }, [addAnswer, setNotice, refreshQueue]);

  const submit = useCallback(async (q: string) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    try { await handle(await ask(q.trim(), deps(controller.signal))); }
    catch { /* aborted by a newer question */ }
    finally { if (abort.current === controller) setBusy(false); }
  }, [deps, handle, setBusy]);

  // Questions asked while offline are answered, in order, as soon as the connection returns.
  const drainQueue = useCallback(async () => {
    for (const item of await listQueue()) {
      const outcome = await ask(item.question, deps());
      // Still offline, or online with no way to read it (no key): keep it queued rather than lose the question.
      if (outcome.kind === 'queued' || outcome.kind === 'error') break;
      await handle(outcome);
      await dequeue(item.id);
    }
    await refreshQueue();
  }, [deps, handle, refreshQueue]);

  useEffect(() => {
    void refreshQueue();
    const on = () => { setOnline(true); void drainQueue(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    if ('serviceWorker' in navigator) void navigator.serviceWorker.ready.then(() => useStore.getState().setSwReady(true));
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [drainQueue, refreshQueue, setOnline]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === '/' && !typing) { e.preventDefault(); input.current?.focus(); }
      if (e.key === 'Escape' && busy) abort.current?.abort();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy]);

  const [latest, ...earlier] = answers;
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Poochho <span className="font-normal text-muted">· पूछो · ಕೇಳಿ</span></h1>
        <p className="mt-1 text-muted">Ask a dataset questions in your language. Charts and maps are drawn on this device, so it keeps working with no connection.</p>
      </header>
      <StatusBar />
      <main className="mt-4 space-y-4">
        <AskBar ref={input} value={question} busy={busy} onChange={setQuestion} onSubmit={submit} />
        {notice && <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`rounded-lg px-3 py-2 text-sm ${notice.kind === 'error' ? 'bg-warn/10 text-warn' : 'bg-accent-soft text-accent'}`}>{notice.text}</p>}
        {latest ? <AnswerCard answer={latest} /> : (
          <section className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">
            <p>Ask a question or pick an example above. The data is {data.n.toLocaleString('en-IN')} made-up complaints across Karnataka's districts, January 2025 to June 2026.</p>
          </section>
        )}
        {earlier.length > 0 && (
          <section aria-labelledby="earlier" className="space-y-4">
            <h2 id="earlier" className="text-sm font-medium text-muted">Earlier questions</h2>
            {earlier.map(a => <AnswerCard key={a.id} answer={a} />)}
          </section>
        )}
        <Settings />
      </main>
      <footer className="mt-8 text-xs text-muted">
        Complaint data is synthetic, generated on your device from a fixed seed. District positions are approximate. Not affiliated with Sarvam AI; it uses Sarvam's public API.
      </footer>
    </div>
  );
}
