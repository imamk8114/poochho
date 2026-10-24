import { max } from 'd3-array';
import { scaleLinear, scalePoint } from 'd3-scale';
import { line } from 'd3-shape';
import type { ResultRow } from '../query/types';
import { fmt } from './format';

export default function LineChart({ rows, unit }: { rows: ResultRow[]; unit: string }) {
  const w = 480, h = 260, m = { t: 14, r: 12, b: 32, l: 40 };
  const x = scalePoint<string>().domain(rows.map(r => r.label)).range([m.l, w - m.r]).padding(0.1);
  const y = scaleLinear().domain([0, max(rows, r => r.value) || 1]).nice().range([h - m.b, m.t]);
  const path = line<ResultRow>().x(r => x(r.label) ?? 0).y(r => y(r.value))(rows) ?? '';
  const step = Math.ceil(rows.length / 5);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Line chart over ${rows.length} months, ${unit}. The same numbers are in the table view.`} className="w-full">
      {y.ticks(4).map(t => (
        <g key={t}>
          <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} className="stroke-line" />
          <text x={m.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted text-[13px]">{fmt(t)}</text>
        </g>
      ))}
      <path d={path} fill="none" strokeWidth={2.5} className="stroke-accent" />
      {rows.map((r, i) => (
        <g key={r.key}>
          <circle cx={x(r.label)} cy={y(r.value)} r={3.5} className="fill-accent"><title>{`${r.label}: ${fmt(r.value)} ${unit}`}</title></circle>
          {i % step === 0 && <text x={x(r.label)} y={h - 12} textAnchor="middle" className="fill-muted text-[13px]">{r.label.replace(/ 20/, " '")}</text>}
        </g>
      ))}
    </svg>
  );
}

