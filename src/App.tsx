import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { canAccess } from './data/roleAccess';
import { LoginPage } from './pages/LoginPage';
import { AppProvider, useAppContext } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { ShieldAlert } from 'lucide-react';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ScanPage = lazy(() => import('./pages/ScanPage').then((m) => ({ default: m.ScanPage })));
const WorkersPage = lazy(() => import('./pages/WorkersPage').then((m) => ({ default: m.WorkersPage })));
const WorkerDetailPage = lazy(() => import('./pages/WorkerDetailPage').then((m) => ({ default: m.WorkerDetailPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const MeasurementDetailPage = lazy(() =>
  import('./pages/MeasurementDetailPage').then((m) => ({ default: m.MeasurementDetailPage }))
);
const CalibrationPage = lazy(() => import('./pages/CalibrationPage').then((m) => ({ default: m.CalibrationPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const WristbandsPage = lazy(() => import('./pages/WristbandsPage').then((m) => ({ default: m.WristbandsPage })));
const DemoPage = lazy(() => import('./pages/DemoPage').then((m) => ({ default: m.DemoPage })));
const SciencePage = lazy(() => import('./pages/SciencePage').then((m) => ({ default: m.SciencePage })));
const ArchitecturePage = lazy(() => import('./pages/ArchitecturePage').then((m) => ({ default: m.ArchitecturePage })));

const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));

function Guard({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { pathname } = useLocation();
  if (session && !canAccess(session.role, session.demo, pathname)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Gate({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  return session ? <>{children}</> : <LoginPage />;
}

function LoadingGate({ children }: { children: React.ReactNode }) {
  const { ready, seedError } = useAppContext();
  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink-950 text-ink-100">
        <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-ink-800 text-accent-400">
          <ShieldAlert size={24} />
        </span>
        {seedError ? (
          <>
            <p className="text-sm font-semibold text-white">Local storage unavailable.</p>
            <p className="max-w-md text-center text-xs text-ink-400">{seedError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-accent-500 px-4 py-2 text-xs font-semibold text-white"
            >
              Retry storage
            </button>
          </>
        ) : (
          <p className="text-sm font-medium tracking-wide text-ink-300">Initialising local storage…</p>
        )}
      </div>
    );
  }
  return <>{children}</>;
}

function RouteFallback() {
  return <div className="py-10 text-center text-xs text-ink-400">Loading…</div>;
}

export default function App() {
  return (
    <AuthProvider>
    <AppProvider>
      <LoadingGate>
        <BrowserRouter>
          <Gate>
          <AppShell>
            <Guard>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/scan" element={<ScanPage />} />
                <Route path="/workers" element={<WorkersPage />} />
                <Route path="/workers/:workerId" element={<WorkerDetailPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/history/:measurementId" element={<MeasurementDetailPage />} />
                <Route path="/calibration" element={<CalibrationPage />} />
                <Route path="/wristbands" element={<WristbandsPage />} />
                <Route path="/demo" element={<DemoPage />} />
                <Route path="/science" element={<SciencePage />} />
                <Route path="/architecture" element={<ArchitecturePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </Suspense>
            </Guard>
          </AppShell>
          </Gate>
        </BrowserRouter>
      </LoadingGate>
    </AppProvider>
    </AuthProvider>
  );
}
