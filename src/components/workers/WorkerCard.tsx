import { useNavigate } from 'react-router-dom';
import { ChevronRight, Watch } from 'lucide-react';
import type { Worker } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { StatusPill } from '../common/StatusPill';

export function WorkerCard({ worker }: { worker: Worker }) {
  const navigate = useNavigate();
  const { shifts, activeWorkerId, setActiveWorkerId } = useAppContext();
  const hasActiveShift = shifts.some((s) => s.workerId === worker.id && s.status === 'active');
  const isActive = activeWorkerId === worker.id;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-sm shadow-ink-900/[0.03]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-800 text-sm font-bold text-white">
        {worker.name.charAt(0)}
      </span>
      <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/workers/${worker.id}`)}>
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink-900">{worker.name}</p>
          {worker.isDemo && (
            <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-500">
              Demo
            </span>
          )}
        </div>
        <p className="truncate text-xs text-ink-500">
          {worker.role} · {worker.department}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] text-ink-400">
            <Watch size={11} /> {worker.wristbandId ?? 'Unassigned'}
          </span>
          {hasActiveShift && <StatusPill tone="good">On shift</StatusPill>}
        </div>
      </button>
      <button
        onClick={() => setActiveWorkerId(worker.id)}
        className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
          isActive ? 'bg-accent-500 text-white' : 'bg-ink-100 text-ink-600'
        }`}
      >
        {isActive ? 'Active' : 'Set active'}
      </button>
      <ChevronRight size={16} className="shrink-0 text-ink-300" onClick={() => navigate(`/workers/${worker.id}`)} />
    </div>
  );
}
