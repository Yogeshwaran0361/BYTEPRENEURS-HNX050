import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading your information...',
  subMessage = 'Please take your time',
  className,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={twMerge(
        clsx(
          'flex flex-col items-center justify-center text-center p-10 md:p-14 min-h-[260px]',
          className
        )
      )}
    >
      <div className="relative mb-5">
        <div className="w-12 h-12 rounded-full border-3 border-nest-border border-t-terracotta-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-terracotta-500" />
        </div>
      </div>
      <p className="text-xl font-bold text-nest-ink mb-1">{message}</p>
      {subMessage && (
        <p className="text-base text-nest-ink-muted">{subMessage}</p>
      )}
      <span className="sr-only">Loading content, please wait.</span>
    </div>
  );
};
