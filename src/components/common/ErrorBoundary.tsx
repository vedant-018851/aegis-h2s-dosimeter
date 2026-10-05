import React from 'react';

async function resetLocalState() {
  try {
    localStorage.clear();
    sessionStorage.clear();
    const regs = await navigator.serviceWorker?.getRegistrations();
    await Promise.all((regs ?? []).map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } finally {
    location.href = '/';
  }
}

interface State { error: Error | null }

/** Shows a readable error screen instead of a blank white page. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink-50 px-6 text-center">
        <h1 className="text-lg font-bold text-ink-900">Something went wrong</h1>
        <p className="max-w-md text-sm text-ink-600">The app hit an error. This is often caused by an old cached copy of the app.</p>
        <pre className="max-w-md overflow-x-auto rounded-lg bg-white p-3 text-left text-xs text-red-700">{this.state.error.message}</pre>
        <div className="flex gap-2">
          <button onClick={() => location.reload()} className="min-h-11 rounded-xl border border-ink-300 bg-white px-4 text-sm font-semibold">Reload</button>
          <button onClick={resetLocalState} className="min-h-11 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white">Reset app cache &amp; sign out</button>
        </div>
      </div>
    );
  }
}
