import React from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-accent-500 text-white hover:bg-accent-600 focus-visible:ring-accent-400 shadow-sm shadow-accent-500/20',
  secondary:
    'bg-white text-ink-800 border border-ink-300 hover:bg-ink-50 focus-visible:ring-ink-400',
  ghost: 'bg-transparent text-ink-700 hover:bg-ink-100 focus-visible:ring-ink-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg',
  md: 'text-sm px-4 py-2.5 gap-2 rounded-xl',
  lg: 'text-base px-5 py-3.5 gap-2.5 rounded-2xl',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  fullWidth,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-semibold transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.98]',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
