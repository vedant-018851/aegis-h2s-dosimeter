import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { DEMO_PRESETS } from '../data/demoPresets';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const GUIDE = [
  'Select a worker and start a shift (Workers page)',
  'Run “Moderate exposure” below: watch the 12-step pipeline',
  'Point out badge validity, quality score and SIMULATED label',
  'Save the measurement and open it from History',
  'Immediately run “Blurry scan” or “Expired badge”: safe rejection, no dose',
];

export function DemoPage() {
  const navigate = useNavigate();
  const { activeWorker, activeShift } = useAppContext();
  const { session } = useAuth();
  const opticalDemoAllowed = session?.role === 'supervisor' || session?.role === 'worker';
  const go = (id: string) => navigate(`/scan?preset=${id}`);

  if (!opticalDemoAllowed) {
    return (
      <Card>
        <CardHeader title="Demo Center" subtitle="Safety Officer access" />
        <p className="text-sm text-ink-700">
          Optical wristband demo scans are restricted to Supervisors and Workers. Safety Officers can use Scan to verify wristband QR identities.
        </p>
        <Button className="mt-3" variant="primary" onClick={() => navigate('/scan')}>Verify Wristband QR</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink-900">Demo Control Center</h1>
        <p className="text-xs text-ink-500">Deterministic presets for a 60–90 second walkthrough</p>
      </div>
      <Card>
        <CardHeader title="Guided demo" subtitle={`Worker: ${activeWorker?.name ?? 'none'} · Shift: ${activeShift?.label ?? 'none'}`} />
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-800">
          {GUIDE.map((g) => <li key={g}>{g}</li>)}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => go('moderate_exposure')}>Start: moderate exposure</Button>
          <Button onClick={() => go('blurry_scan')}>Then: blurry scan</Button>
        </div>
      </Card>
      {(['exposure', 'failure'] as const).map((cat) => (
        <Card key={cat}>
          <CardHeader title={cat === 'exposure' ? 'Successful measurements' : 'Safe-rejection cases'} />
          <div className="grid gap-2 sm:grid-cols-2">
            {DEMO_PRESETS.filter((p) => p.category === cat).map((p) => (
              <button
                key={p.id}
                onClick={() => go(p.id)}
                className="flex min-h-11 items-start gap-2 rounded-xl border border-ink-200 p-3 text-left transition-colors duration-300 hover:bg-ink-50 focus-visible:outline-2 focus-visible:outline-accent-500"
              >
                {cat === 'exposure' ? <Check size={16} className="mt-0.5 text-emerald-600" aria-hidden /> : <X size={16} className="mt-0.5 text-red-600" aria-hidden />}
                <span>
                  <span className="block text-sm font-semibold text-ink-900">{p.label}</span>
                  <span className="block text-xs text-ink-500">{p.description}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
