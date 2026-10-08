import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "We couldn't load your medication routine",
  message = "Please check your connection or try again in a moment.",
  onRetry,
  className,
}) => {
  return (
    <div
      role="alert"
      className={twMerge(
        clsx(
          'flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-tactile-lg border border-crimson-200 bg-crimson-50/40 my-4',
          className
        )
      )}
    >
      <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-crimson-600 mb-4 border border-crimson-200 shadow-tactile-sm">
        <AlertCircle className="w-7 h-7" aria-hidden="true" />
      </div>
      <h3 className="text-xl md:text-2xl font-bold text-nest-ink mb-2">{title}</h3>
      <p className="text-base md:text-lg text-nest-ink-muted max-w-md mb-6 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="secondary"
          size="large"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-5 h-5" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
