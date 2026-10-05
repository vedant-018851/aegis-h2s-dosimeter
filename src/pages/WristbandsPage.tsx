import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { storageService } from '../services/storage';
import { LIFECYCLE_LABEL, wristbandLifecycle } from '../utils/wristbandLifecycle';
import { BAND_ID_PRIVACY_NOTE } from '../data/constants';

export function WristbandsPage() {
  const { wristbands, workers, shifts, refreshAll } = useAppContext();
  const [actionError, setActionError] = useState<string | null>(null);

  const assign = async (wbId: string, workerId: string) => {
    setActionError(null);
    try {
      await storageService.assignWristband(wbId, workerId);
      await refreshAll();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not assign this wristband.');
    }
  };

  const release = async (wbId: string) => {
    setActionError(null);
    try {
      await storageService.releaseWristband(wbId);
      await refreshAll();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not unassign this wristband.');
    }
  };

  const retire = async (wbId: string) => {
    setActionError(null);
    const wb = wristbands.find((w) => w.id === wbId);
    if (!wb) return;
    const activeShift = shifts.find((s) => s.wristbandId === wbId && s.status === 'active');
    if (activeShift) {
      setActionError(`Cannot retire ${wbId} while it is linked to active shift ${activeShift.id}. End the shift first.`);
      return;
    }
    if (wb.usedAt) {
      setActionError(`${wbId} has already been consumed by ${wb.usedByMeasurementId ?? 'a measurement'} and is already single-use locked.`);
      return;
    }
    try {
      if (wb.assignedWorkerId) await storageService.releaseWristband(wbId);
      const latest = await storageService.getWristband(wbId);
      if (!latest) throw new Error(`Wristband ${wbId} was not found.`);
      await storageService.putWristband({ ...latest, status: 'retired', assignedWorkerId: null });
      await refreshAll();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not retire this wristband.');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink-900">Wristband Lifecycle</h1>
        <p className="text-xs text-ink-500">Available → Assigned → Active → Used/Expired → Retired</p>
        <p className="mt-1 text-[11px] text-ink-400">{BAND_ID_PRIVACY_NOTE}</p>
      </div>
      {actionError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{actionError}</div>}
      {wristbands.map((wb) => {
        const state = wristbandLifecycle(wb, shifts);
        const owner = workers.find((w) => w.id === wb.assignedWorkerId);
        const activeShift = shifts.find((s) => s.wristbandId === wb.id && s.status === 'active');
        const locked = state === 'retired';
        return (
          <Card key={wb.id}>
            <CardHeader
              title={wb.id}
              subtitle={`Batch ${wb.batch} · expires ${new Date(wb.expiresAt).toLocaleDateString()}`}
              action={<span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-800">{LIFECYCLE_LABEL[state]}</span>}
            />
            <p className="mb-1 text-xs text-ink-500">Worker: {owner ? `${owner.name} (${owner.id})` : 'Unassigned'}</p>
            {activeShift && <p className="mb-2 text-[11px] font-medium text-amber-700">Locked by active shift {activeShift.id}. End the shift before unassigning or retiring.</p>}
            {wb.usedAt && <p className="mb-3 text-[11px] text-ink-400">Used {new Date(wb.usedAt).toLocaleString()}{wb.usedByMeasurementId ? ` · ${wb.usedByMeasurementId}` : ''} — single-use, cannot be measured again.</p>}
            {!wb.usedAt && <div className="mb-3" />}
            <div className="flex flex-wrap items-center gap-2">
              {!owner && !locked && state !== 'expired' && !wb.usedAt && (
                <select aria-label={`Assign ${wb.id} to worker`} className="min-h-11 rounded-lg border border-ink-200 px-2 text-sm" defaultValue="" onChange={(e) => e.target.value && void assign(wb.id, e.target.value)}>
                  <option value="" disabled>Assign to worker…</option>
                  {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              )}
              {owner && !locked && !wb.usedAt && <Button size="sm" disabled={!!activeShift} onClick={() => void release(wb.id)}>Unassign</Button>}
              {!locked && !wb.usedAt && <Button size="sm" variant="danger" disabled={!!activeShift} onClick={() => void retire(wb.id)}>Retire</Button>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
