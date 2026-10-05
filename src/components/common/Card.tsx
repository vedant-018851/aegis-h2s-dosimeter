import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({ className, padded = true, children, ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-ink-200 bg-white shadow-sm shadow-ink-900/[0.03]',
        padded && 'p-4 sm:p-5',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h3 className="text-sm font-semibold tracking-wide text-ink-900">{title}</h3>
        {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
