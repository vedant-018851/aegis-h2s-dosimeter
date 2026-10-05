import { useState } from 'react';
import { ShieldCheck, Trash2, Info, FileJson } from 'lucide-react';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useAppContext } from '../context/AppContext';
import { storageService } from '../services/storage';
import { exportJsonBackup } from '../services/exportService';
import { CURRENT_MODEL_VERSION, LOCAL_DATA_NOTICE, APP_NAME, PROBLEM_STATEMENT, TEAM_NAME, SAFETY_DISCLAIMER } from '../data/constants';

export function SettingsPage() {
  const { refreshAll, setActiveWorkerId } = useAppContext();
  const [confirmWipe, setConfirmWipe] = useState(false);

  const handleWipe = async () => {
    await storageService.wipeAllData();
    setActiveWorkerId(null);
    await refreshAll();
    setConfirmWipe(false);
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-ink-900">Settings</h1>

      <Card className="flex items-start gap-3">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold text-ink-900">Data privacy</p>
          <p className="mt-1 text-xs text-ink-500">{LOCAL_DATA_NOTICE} Nothing is sent to an external server.</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="About this prototype" />
        <div className="space-y-1.5 text-sm">
          <Row label="App" value={`${APP_NAME} (prototype)`} />
          <Row label="Team" value={TEAM_NAME} />
          <Row label="Active model version" value={CURRENT_MODEL_VERSION} />
          <Row label="Problem statement" value={PROBLEM_STATEMENT} />
          <Row label="Storage" value="IndexedDB (local device)" />
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-ink-50 p-3 text-xs text-ink-500">
          <Info size={14} className="mt-0.5 shrink-0" />
          Dose values are produced by a simulated calibration model pending controlled H₂S laboratory
          validation. See the Calibration section for details.
        </div>
      </Card>

      <Card className="flex items-start gap-3 border-ink-300 bg-ink-50">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-ink-500" />
        <div>
          <p className="text-sm font-semibold text-ink-900">Safety boundary</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-600">{SAFETY_DISCLAIMER}</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Data management" />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="secondary"
            icon={<FileJson size={15} />}
            onClick={async () => exportJsonBackup(await storageService.exportAllJSON())}
          >
            Export full JSON backup
          </Button>
          <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => setConfirmWipe(true)}>
            Wipe all local data
          </Button>
        </div>
      </Card>

      <Modal open={confirmWipe} title="Wipe all local data?" onClose={() => setConfirmWipe(false)}>
        <p className="text-sm text-ink-600">
          This permanently deletes all workers, wristbands, shifts, measurements and calibration samples
          stored on this device, and reseeds the demo dataset. This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmWipe(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleWipe}>
            Wipe data
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}
