import { max } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import type { ResultRow } from '../query/types';
import { fmt } from './format';

/**
 * Bars as plain HTML rather than SVG: labels stay at a readable size on a phone instead of shrinking with the
 * drawing. D3 still supplies the scale; the layout is a grid.
 */
export function BarChart({ rows, unit }: { rows: ResultRow[]; unit: string }) {
  const pct = scaleLinear().domain([0, max(rows, r => r.value) || 1]).range([0, 100]);
  return (
    <ol className="space-y-1.5" aria-label={`Bar chart of ${rows.length} items, ${unit}. The same numbers are in the table view.`}>
      {rows.map(r => (
        <li key={r.key} className="grid grid-cols-[minmax(6.5rem,9.5rem)_1fr_auto] items-center gap-x-2 text-sm">
          <span className="truncate text-right" title={r.label}>{r.label}</span>
          <span className="h-5 rounded bg-accent-soft/60">
            <span className="block h-5 rounded bg-accent" style={{ width: `${Math.max(1, pct(r.value))}%` }} />
          </span>
          <span className="min-w-[3.5rem] tabular-nums text-muted">{fmt(r.value)}</span>
        </li>
      ))}
    </ol>
  );
}
