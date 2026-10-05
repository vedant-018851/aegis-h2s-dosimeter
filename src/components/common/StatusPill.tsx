import React from 'react';
import clsx from 'clsx';

export type StatusTone = 'good' | 'warn' | 'bad' | 'neutral';

const TONE_CLASSES: Record<StatusTone, string> = {
  good: 'bg-[var(--color-status-good-bg)] text-[var(--color-status-good)] ring-1 ring-inset ring-emerald-600/15',
  warn: 'bg-[var(--color-status-warn-bg)] text-[var(--color-status-warn)] ring-1 ring-inset ring-amber-600/15',
  bad: 'bg-[var(--color-status-bad-bg)] text-[var(--color-status-bad)] ring-1 ring-inset ring-red-600/15',
  neutral: 'bg-[var(--color-status-neutral-bg)] text-[var(--color-status-neutral)] ring-1 ring-inset ring-ink-600/10',
};

interface StatusPillProps {
  tone: StatusTone;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function StatusPill({ tone, children, icon, className }: StatusPillProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
        TONE_CLASSES[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function DisclaimerTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md bg-ink-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-100">
      {children}
    </div>
  );
}
