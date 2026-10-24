import type { ResultRow } from '../query/types';
import { fmt } from './format';

export function DataTable({ rows, valueHeading }: { rows: ResultRow[]; valueHeading: string }) {
  return (
    <div className="max-h-96 overflow-auto rounded-lg border border-line">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Results</caption>
        <thead className="sticky top-0 bg-card text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Name</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">{valueHeading}</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Complaints</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-t border-line">
              <th scope="row" className="px-3 py-1.5 font-normal">{r.label}</th>
              <td className="px-3 py-1.5 text-right tabular-nums">{fmt(r.value)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-muted">{r.count.toLocaleString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
