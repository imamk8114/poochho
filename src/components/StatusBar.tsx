import { DATASET_SIZE } from '../data/meta';
import { useStore } from '../store';

export function StatusBar() {
  const { online, swReady, queued } = useStore();
  const pill = 'rounded-full border px-2.5 py-0.5 text-xs';
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Connection and storage status">
      <li role="status" className={`${pill} ${online ? 'border-accent/40 bg-accent-soft text-accent' : 'border-warn/50 bg-warn/10 text-warn'}`}>
        {online ? 'Online' : 'Offline: everything still works'}
      </li>
      <li className={`${pill} border-line text-muted`}>{swReady ? 'Saved for offline use' : 'Offline copy not installed yet'}</li>
      <li className={`${pill} border-line text-muted`}>{DATASET_SIZE.toLocaleString('en-IN')} synthetic complaints on this device</li>
      {queued > 0 && <li className={`${pill} border-warn/50 bg-warn/10 text-warn`}>{queued} question{queued > 1 ? 's' : ''} waiting for a connection</li>}
    </ul>
  );
}
