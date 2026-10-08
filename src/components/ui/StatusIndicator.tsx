import React from 'react';
import { clsx } from 'clsx';
import { MedicationStatus } from '../../types';

export interface StatusIndicatorProps {
  status: MedicationStatus;
  showText?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  showText = true,
  className,
}) => {
  const dotColor = {
    UPCOMING: 'bg-nest-ink-faint',
    DUE: 'bg-terracotta-500',
    TAKEN: 'bg-olive-500',
    DELAYED: 'bg-amberwarm-500',
    MISSED: 'bg-crimson-500',
    ATTENTION_REQUIRED: 'bg-amberwarm-600',
  }[status];

  const label = {
    UPCOMING: 'Upcoming',
    DUE: 'Due now',
    TAKEN: 'Taken',
    DELAYED: 'Pending',
    MISSED: 'Not confirmed',
    ATTENTION_REQUIRED: 'Attention needed',
  }[status];

  return (
    <span className={clsx('inline-flex items-center gap-2 text-sm text-nest-ink', className)}>
      <span
        className={clsx('w-2.5 h-2.5 rounded-full shrink-0', dotColor)}
        aria-hidden="true"
      />
      {showText && <span>{label}</span>}
      <span className="sr-only">Status: {label}</span>
    </span>
  );
};
