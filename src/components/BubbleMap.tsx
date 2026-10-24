import { max } from 'd3-array';
import { scaleSqrt } from 'd3-scale';
import type { ResultRow } from '../query/types';
import { fmt } from './format';

// Karnataka's bounding box. Longitude is squeezed by cos(latitude) so shapes are not stretched sideways.
const LAT = [11.4, 18.1], LON = [73.9, 78.4], W = 520, H = 620, PAD = 30;
const k = Math.cos((15 * Math.PI) / 180);
const spanX = (LON[1] - LON[0]) * k, spanY = LAT[1] - LAT[0];
const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);
const px = (lon: number) => PAD + (lon - LON[0]) * k * scale;
const py = (lat: number) => PAD + (LAT[1] - lat) * scale;

/**
 * A bubble map with no basemap tiles, so it draws identically with no network. Swapping in a vector-tile
 * layer for connected use is a separate, optional step.
 */
export default function BubbleMap({ rows, unit }: { rows: ResultRow[]; unit: string }) {
  const r = scaleSqrt().domain([0, max(rows, d => d.value) || 1]).range([3, 30]);
  const labelled = new Set([...rows].sort((a, b) => b.value - a.value).slice(0, 6).map(d => d.key));
  const points = rows.filter(d => d.lat !== undefined && d.lon !== undefined);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Bubble map of ${points.length} Karnataka districts, ${unit}. The same numbers are in the table view.`} className="mx-auto max-h-[560px] w-full">
      <rect x={PAD / 2} y={PAD / 2} width={W - PAD} height={H - PAD} rx={12} className="fill-accent-soft/40 stroke-line" />
      {[...points].sort((a, b) => b.value - a.value).map(d => (
        <g key={d.key}>
          <circle cx={px(d.lon!)} cy={py(d.lat!)} r={r(d.value)} className="fill-accent/55 stroke-accent" strokeWidth={1.2}>
            <title>{`${d.label}: ${fmt(d.value)} ${unit}`}</title>
          </circle>
          {labelled.has(d.key) && (
            <text x={px(d.lon!)} y={py(d.lat!) + r(d.value) + 16} textAnchor="middle" className="fill-ink text-[15px]" style={{ paintOrder: 'stroke', stroke: 'rgb(var(--card))', strokeWidth: 4, strokeLinejoin: 'round' }}>{d.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}
