import { forwardRef, type FormEvent } from 'react';

export const EXAMPLES: { lang: string; text: string }[] = [
  { lang: 'EN', text: 'Which 5 districts have the most water complaints?' },
  { lang: 'हिं', text: 'पिछले 6 महीने में सड़क की शिकायतें महीने के हिसाब से' },
  { lang: 'ಕನ್', text: 'ಜಿಲ್ಲೆ ಪ್ರಕಾರ ಕಸ ದೂರುಗಳು ನಕ್ಷೆ' },
  { lang: 'EN', text: 'Average resolution time by category' },
  { lang: 'EN', text: 'Show a map of open complaints' },
];

interface Props {
  value: string;
  busy: boolean;
  onChange: (v: string) => void;
  onSubmit: (q: string) => void;
}

export const AskBar = forwardRef<HTMLInputElement, Props>(function AskBar({ value, busy, onChange, onSubmit }, ref) {
  const submit = (e: FormEvent) => { e.preventDefault(); if (value.trim()) onSubmit(value); };
  return (
    <form onSubmit={submit} role="search" className="rounded-2xl border border-line bg-card p-4 shadow-sm sm:p-5">
      <label htmlFor="ask" className="mb-1.5 block text-sm font-medium">Ask a question about the complaints</label>
      <div className="flex gap-2">
        <input
          ref={ref} id="ask" value={value} onChange={e => onChange(e.target.value)} lang="" autoComplete="off" enterKeyHint="search"
          placeholder="e.g. which districts have the most water complaints?   (press / to focus)"
          className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2.5 text-base"
        />
        <button type="submit" disabled={busy || !value.trim()} className="rounded-lg bg-accent px-5 py-2.5 font-medium text-white disabled:opacity-50">
          {busy ? 'Working…' : 'Ask'}
        </button>
      </div>
      <p className="mb-1.5 mt-3 text-xs text-muted">Try one, in English, Hindi or Kannada:</p>
      <ul className="flex flex-wrap gap-2">
        {EXAMPLES.map(ex => (
          <li key={ex.text}>
            <button type="button" onClick={() => { onChange(ex.text); onSubmit(ex.text); }} className="rounded-full border border-line px-3 py-1 text-left text-sm hover:border-accent hover:text-accent">
              <span className="mr-1.5 text-xs text-muted">{ex.lang}</span>{ex.text}
            </button>
          </li>
        ))}
      </ul>
    </form>
  );
});
