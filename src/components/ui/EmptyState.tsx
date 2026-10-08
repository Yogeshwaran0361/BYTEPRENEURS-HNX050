import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      role="region"
      aria-label={title}
      className={twMerge(
        clsx(
          'flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-tactile-lg border border-dashed border-nest-border bg-nest-surface-subtle/50 my-4',
          className
        )
      )}
    >
      <div className="w-14 h-14 rounded-full bg-nest-surface flex items-center justify-center text-nest-ink-muted mb-4 border border-nest-border shadow-tactile-sm">
        {icon || <Inbox className="w-7 h-7" aria-hidden="true" />}
      </div>
      <h3 className="text-xl md:text-2xl font-bold text-nest-ink mb-2">{title}</h3>
      <p className="text-base md:text-lg text-nest-ink-muted max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="large" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
