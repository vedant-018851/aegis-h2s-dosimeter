import React from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { useAppContext } from '../../context/AppContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { workers, measurements, seedError, reloadDemoData } = useAppContext();
  const empty = workers.length === 0 && measurements.length === 0;

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar />
        <main className="flex-1 pb-24 md:pb-8">
          <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
            {(empty || seedError) && (
              <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <span>
                  {seedError ? `Demo data could not be fully loaded (${seedError}).` : 'No data found in this browser\'s local database.'}
                </span>
                <button onClick={reloadDemoData} className="min-h-11 rounded-lg bg-amber-500 px-4 font-semibold text-white hover:bg-amber-600">
                  Load demo data
                </button>
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
