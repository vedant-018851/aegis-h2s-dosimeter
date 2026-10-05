import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ROLE_LABEL } from '../data/roleAccess';

export function ProfilePage() {
  const { session, logout } = useAuth();
  const { activeWorker } = useAppContext();
  if (!session) return null;
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-ink-900">Profile</h1>
      <Card>
        <CardHeader title={session.name} subtitle={`${ROLE_LABEL[session.role]}${session.demo ? ' · Demo session' : ''}`} />
        <p className="text-xs text-ink-500">User ID: {session.userId}</p>
        <p className="mt-1 text-xs text-ink-500">Active worker context: {activeWorker ? `${activeWorker.name} (${activeWorker.id})` : 'none selected'}</p>
        <div className="mt-4"><Button variant="danger" icon={<LogOut size={16} />} onClick={logout}>Sign out</Button></div>
      </Card>
    </div>
  );
}
