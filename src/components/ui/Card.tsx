import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'highlight' | 'warm';
  isInteractive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  isInteractive = false,
  ...props
}) => {
  const variantClasses = {
    default: 'bg-nest-surface border-nest-border text-nest-ink shadow-tactile-sm',
    subtle: 'bg-nest-surface-subtle border-nest-border text-nest-ink',
    highlight: 'bg-terracotta-50/60 border-terracotta-200 text-nest-ink shadow-tactile',
    warm: 'bg-[#F7F2EB] border-[#DDD5C8] text-nest-ink shadow-tactile-sm',
  }[variant];

  return (
    <div
      className={twMerge(
        clsx(
          'rounded-tactile-lg border p-6 md:p-7 transition-all',
          variantClasses,
          isInteractive && 'hover:shadow-tactile hover:border-nest-border-strong cursor-pointer active:scale-[0.995]',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(clsx('flex items-start justify-between gap-4 pb-4 border-b border-nest-border/70 mb-5', className))}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <h3
      className={twMerge(clsx('text-xl md:text-2xl font-bold tracking-tight text-nest-ink', className))}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <p
      className={twMerge(clsx('text-base text-nest-ink-muted mt-1', className))}
      {...props}
    >
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={twMerge(clsx('space-y-4', className))} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(clsx('flex items-center justify-between gap-4 pt-5 mt-6 border-t border-nest-border/70', className))}
      {...props}
    >
      {children}
    </div>
  );
};
