import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  helperText?: string;
  errorMessage?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  required = false,
  helperText,
  errorMessage,
  className,
  children,
}) => {
  return (
    <div className={twMerge(clsx('flex flex-col space-y-1.5', className))}>
      <label
        htmlFor={id}
        className="text-base font-semibold text-nest-ink flex items-center gap-1 select-none"
      >
        <span>{label}</span>
        {required && (
          <span className="text-terracotta-600 font-bold" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">(required)</span>}
      </label>

      {children}

      {helperText && !errorMessage && (
        <p id={`${id}-helper`} className="text-sm text-nest-ink-muted">
          {helperText}
        </p>
      )}

      {errorMessage && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-sm font-medium text-crimson-600 flex items-center gap-1"
        >
          <span aria-hidden="true">⚠️</span>
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
};
