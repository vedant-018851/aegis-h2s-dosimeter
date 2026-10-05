import { useState } from 'react';
import type { Worker } from '../../types';
import { Button } from '../common/Button';

interface WorkerFormProps {
  initial?: Worker | null;
  onSubmit: (data: Omit<Worker, 'createdAt' | 'updatedAt' | 'isDemo'>) => void;
  onCancel: () => void;
}

export function WorkerForm({ initial, onSubmit, onCancel }: WorkerFormProps) {
  const [id, setId] = useState(initial?.id ?? `W-${Math.floor(100 + Math.random() * 900)}`);
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [department, setDepartment] = useState(initial?.department ?? '');
  const [wristbandId, setWristbandId] = useState(initial?.wristbandId ?? '');

  const canSubmit = name.trim().length > 0 && role.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({ id, name: name.trim(), role: role.trim(), department: department.trim(), wristbandId: wristbandId.trim() || null });
      }}
      className="space-y-3"
    >
      <Field label="Worker ID">
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          disabled={!!initial}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm disabled:bg-ink-50 disabled:text-ink-400"
        />
      </Field>
      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Role">
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          placeholder="e.g. Process Technician"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Department">
        <input
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="e.g. Operations"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Wristband ID">
        <input
          value={wristbandId}
          onChange={(e) => setWristbandId(e.target.value)}
          placeholder={initial ? 'Assigned from Wristbands page' : 'Assign after creating the worker'}
          disabled
          className="w-full rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-500 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-[10px] text-ink-400">Wristband assignment is managed from the Wristbands page so active-shift and single-use rules stay consistent.</p>
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!canSubmit}>
          {initial ? 'Save changes' : 'Create worker'}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-600">{label}</span>
      {children}
    </label>
  );
}
