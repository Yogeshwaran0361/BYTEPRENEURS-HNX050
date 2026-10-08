import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={twMerge(clsx('flex items-baseline justify-between gap-4 mb-4 mt-6', className))}>
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-nest-ink">
          {title}
        </h2>
        {description && (
          <p className="text-base text-nest-ink-muted mt-0.5">
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
