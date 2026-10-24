// Two small IndexedDB stores: interpreted questions (so repeats work offline) and questions asked while
// offline (answered when the connection returns). Every call degrades to "nothing stored" if IndexedDB is
// unavailable, e.g. in a private window.
import type { QueryPlan } from '../query/types';

const DB_NAME = 'poochho';
const PLANS = 'plans';
const QUEUE = 'queue';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(PLANS);
      req.result.createObjectStore(QUEUE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
}

const normalise = (q: string) => q.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest, fallback: T): Promise<T> {
  try {
    const db = await open();
    return await new Promise<T>(resolve => {
      const req = fn(db.transaction(store, mode).objectStore(store));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => resolve(fallback);
    });
  } catch {
    return fallback;
  }
}

export const getCachedPlan = (question: string) => run<QueryPlan | undefined>(PLANS, 'readonly', s => s.get(normalise(question)), undefined);
export const cachePlan = (question: string, plan: QueryPlan) => run(PLANS, 'readwrite', s => s.put(plan, normalise(question)), undefined).then(() => undefined);

export interface QueuedQuestion {
  id: number;
  question: string;
  at: number;
}

export const listQueue = () => run<QueuedQuestion[]>(QUEUE, 'readonly', s => s.getAll(), []);
export const enqueue = (question: string) => run(QUEUE, 'readwrite', s => s.add({ question, at: Date.now() }), undefined).then(() => undefined);
export const dequeue = (id: number) => run(QUEUE, 'readwrite', s => s.delete(id), undefined).then(() => undefined);
