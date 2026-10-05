// ============================================================================
// Manual wristband ID fallback (spec §1) — the "existing fallback/manual
// workflow" the spec requires when a physical QR can't be read. Resolves
// through the same wristbandIdentity service as a real QR decode, so a
// typo'd or invalid ID is rejected identically.
// ============================================================================

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { storageService } from '../../services/storage';
import { resolveWristbandFromQr, type WristbandResolution } from '../../services/wristbandIdentity';

interface ManualWristbandEntryProps {
  open: boolean;
  onClose: () => void;
  onResolved: (resolution: WristbandResolution) => void;
  defaultValue?: string | null;
}

export function ManualWristbandEntry({ open, onClose, onResolved, defaultValue }: ManualWristbandEntryProps) {
  const [value, setValue] = useState(defaultValue ?? '');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!value.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const resolution = await resolveWristbandFromQr(value.trim(), storageService);
      if (!resolution.ok) {
        setError(resolution.message);
        setChecking(false);
        return;
      }
      setChecking(false);
      onResolved(resolution);
    } catch {
      setChecking(false);
      setError('Could not verify this wristband. Try again.');
    }
  };

  return (
    <Modal open={open} title="Enter Wristband ID" onClose={onClose}>
      <p className="mb-3 text-xs text-ink-500">
        Fallback for when the physical QR code can't be scanned. Enter the printed wristband ID exactly as shown.
      </p>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. WB-0241"
        className="mb-2 w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      {error && <p className="mb-2 text-xs font-medium text-red-600">{error}</p>}
      <Button
        variant="primary"
        size="md"
        fullWidth
        icon={<KeyRound size={15} />}
        onClick={submit}
        disabled={checking || !value.trim()}
      >
        {checking ? 'Verifying…' : 'Use this wristband'}
      </Button>
    </Modal>
  );
}
