import { create } from 'zustand';
import type { Answer } from './query/ask';
import { MODELS, type SarvamModel } from './sarvam/client';

const KEY = 'poochho-key';
const PREFS = 'poochho-prefs';

// The key lives in session storage only: it is gone when the tab closes and is sent nowhere but api.sarvam.ai.
const readKey = () => { try { return sessionStorage.getItem(KEY) ?? ''; } catch { return ''; } };
const writeKey = (k: string) => { try { k ? sessionStorage.setItem(KEY, k) : sessionStorage.removeItem(KEY); } catch { /* memory only */ } };
const readPrefs = (): { useSarvam: boolean; model: SarvamModel } => {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS) ?? '{}');
    return { useSarvam: p.useSarvam !== false, model: MODELS.includes(p.model) ? p.model : MODELS[0] };
  } catch { return { useSarvam: true, model: MODELS[0] }; }
};
const writePrefs = (p: { useSarvam: boolean; model: SarvamModel }) => { try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch { /* ignore */ } };

export interface Notice { kind: 'info' | 'error'; text: string }

interface State {
  apiKey: string;
  useSarvam: boolean;
  model: SarvamModel;
  online: boolean;
  swReady: boolean;
  answers: Answer[];
  queued: number;
  busy: boolean;
  notice: Notice | null;
  setApiKey: (k: string) => void;
  setUseSarvam: (v: boolean) => void;
  setModel: (m: SarvamModel) => void;
  setOnline: (v: boolean) => void;
  setSwReady: (v: boolean) => void;
  addAnswer: (a: Answer) => void;
  setQueued: (n: number) => void;
  setBusy: (b: boolean) => void;
  setNotice: (n: Notice | null) => void;
}

export const useStore = create<State>(set => ({
  apiKey: readKey(),
  ...readPrefs(),
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  swReady: false,
  answers: [],
  queued: 0,
  busy: false,
  notice: null,
  setApiKey: apiKey => { writeKey(apiKey); set({ apiKey }); },
  setUseSarvam: useSarvam => set(s => { writePrefs({ useSarvam, model: s.model }); return { useSarvam }; }),
  setModel: model => set(s => { writePrefs({ useSarvam: s.useSarvam, model }); return { model }; }),
  setOnline: online => set({ online }),
  setSwReady: swReady => set({ swReady }),
  addAnswer: a => set(s => ({ answers: [a, ...s.answers].slice(0, 6) })),
  setQueued: queued => set({ queued }),
  setBusy: busy => set({ busy }),
  setNotice: notice => set({ notice }),
}));
