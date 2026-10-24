import { lazy, Suspense, useState } from 'react';
import type { Answer } from '../query/ask';
import { METRIC_UNIT, planChips } from '../query/describe';
import { BarChart } from './BarChart';
import { DataTable } from './DataTable';
import { DATASET_SIZE } from '../data/meta';
import { fmt } from './format';

// Line and map views load on first use, keeping the first paint (and the first download) small.
const LineChart = lazy(() => import('./LineChart'));
const BubbleMap = lazy(() => import('./BubbleMap'));

const SOURCE: Record<Answer['source'], string> = { sarvam: 'Read by Sarvam', offline: 'Read by the offline parser', cache: 'Read from this device (saved earlier)' };

export function AnswerCard({ answer }: { answer: Answer }) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const { result } = answer;
  const unit = METRIC_UNIT[result.plan.metric];
  const empty = result.rows.length === 0 && result.chart !== 'number';

  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-sm sm:p-5" aria-labelledby={`q-${answer.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 id={`q-${answer.id}`} className="text-base font-semibold sm:text-lg">{answer.question}</h2>
        {result.chart !== 'number' && !empty && (
          <div role="group" aria-label="View" className="flex rounded-lg border border-line text-sm">
            {(['chart', 'table'] as const).map(v => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`px-3 py-1 first:rounded-l-lg last:rounded-r-lg ${view === v ? 'bg-accent text-white' : 'text-muted hover:text-ink'}`}>
                {v === 'chart' ? 'Chart' : 'Table'}
              </button>
            ))}
          </div>
        )}
      </div>

      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="How the question was read">
        {planChips(result.plan).map(c => <li key={c} className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent">{c}</li>)}
      </ul>

      {answer.notice && <p role="alert" className="mt-3 rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">{answer.notice}</p>}

      <div className="mt-4">
        {result.chart === 'number' ? (
          <p className="text-5xl font-semibold tabular-nums">{fmt(result.total.value)} <span className="text-lg font-normal text-muted">{unit}</span></p>
        ) : empty ? (
          <p className="text-muted">No complaints match those filters.</p>
        ) : view === 'table' ? (
          <DataTable rows={result.rows} valueHeading={unit} />
        ) : (
          <Suspense fallback={<p className="text-muted" role="status">Loading chart…</p>}>
            {result.chart === 'line' ? <LineChart rows={result.rows} unit={unit} />
              : result.chart === 'map' ? <BubbleMap rows={result.rows} unit={unit} />
              : <BarChart rows={result.rows} unit={unit} />}
          </Suspense>
        )}
      </div>

      <p className="mt-4 text-xs text-muted">
        {SOURCE[answer.source]}
        {answer.source === 'sarvam' && ` (${answer.model}, ${Math.round(answer.understandMs)} ms)`}
        {' · '}{result.total.count.toLocaleString('en-IN')} of {DATASET_SIZE.toLocaleString('en-IN')} complaints matched, computed on this device in {result.ms < 1 ? 'under 1' : result.ms.toFixed(1)} ms
      </p>
      {answer.matched && answer.matched.length > 0 && (
        <details className="mt-2 text-xs text-muted">
          <summary className="cursor-pointer">What the offline parser recognised</summary>
          <p className="mt-1">{answer.matched.join(' · ')}</p>
        </details>
      )}
    </section>
  );
}
