import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { WorkerCard } from '../components/workers/WorkerCard';
import { WorkerForm } from '../components/workers/WorkerForm';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { storageService } from '../services/storage';
import type { Worker } from '../types';

export function WorkersPage() {
  const { workers, refreshWorkers } = useAppContext();
  const { session } = useAuth();
  const canCreate = session?.role !== 'worker';
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async (data: Omit<Worker, 'createdAt' | 'updatedAt' | 'isDemo'>) => {
    const now = Date.now();
    await storageService.putWorker({ ...data, createdAt: now, updatedAt: now, isDemo: false });
    await refreshWorkers();
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink-900">Workers</h1>
          <p className="text-xs text-ink-500">{workers.length} enrolled</p>
        </div>
        {canCreate && (
          <Button variant="primary" icon={<UserPlus size={16} />} onClick={() => setShowForm(true)}>
            New worker
          </Button>
        )}
      </div>

      <div className="space-y-2.5">
        {workers.map((w) => (
          <WorkerCard key={w.id} worker={w} />
        ))}
      </div>

      <Modal open={showForm} title="Create Worker" onClose={() => setShowForm(false)}>
        <WorkerForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
