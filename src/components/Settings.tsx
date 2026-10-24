import { MODELS, type SarvamModel } from '../sarvam/client';
import { useStore } from '../store';

export function Settings() {
  const { apiKey, setApiKey, useSarvam, setUseSarvam, model, setModel } = useStore();
  return (
    <details className="rounded-2xl border border-line bg-card p-4 sm:p-5">
      <summary className="cursor-pointer font-medium">Settings: use Sarvam for open-ended questions</summary>
      <div className="mt-3 space-y-3 text-sm">
        <div>
          <label htmlFor="key" className="mb-1 block font-medium">Sarvam API key (optional)</label>
          <input id="key" type="password" value={apiKey} onChange={e => setApiKey(e.target.value.trim())} placeholder="sk_…" autoComplete="off" spellCheck={false} className="w-full rounded-lg border border-line bg-paper px-3 py-2" />
          <p className="mt-1 text-xs text-muted">
            Without a key the app uses its built-in offline parser, which understands a fixed vocabulary in English, Hindi and Kannada. With a key, Sarvam reads any phrasing, and the answer is saved on this device so the same question works offline later.
            The key stays in this tab (session storage) and is sent only to api.sarvam.ai.
          </p>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={useSarvam} onChange={e => setUseSarvam(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
          Use Sarvam when a key is set and I am online
        </label>
        <div>
          <label htmlFor="model" className="mb-1 block font-medium">Model</label>
          <select id="model" value={model} onChange={e => setModel(e.target.value as SarvamModel)} className="rounded-lg border border-line bg-paper px-3 py-2">
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
    </details>
  );
}
