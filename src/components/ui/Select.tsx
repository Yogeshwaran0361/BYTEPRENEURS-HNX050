import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  hasError?: boolean;
  sizeVariant?: 'default' | 'large';
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, children, hasError = false, sizeVariant = 'default', disabled, ...props }, ref) => {
    const sizeClasses = {
      default: 'min-h-[48px] px-4 text-base py-2.5',
      large: 'min-h-[56px] px-5 text-lg py-3.5',
    }[sizeVariant];

    return (
      <select
        ref={ref}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : 'false'}
        className={twMerge(
          clsx(
            'w-full rounded-tactile bg-nest-surface text-nest-ink border transition-all appearance-none cursor-pointer',
            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-terracotta-500',
            'disabled:bg-nest-surface-subtle disabled:opacity-60 disabled:cursor-not-allowed',
            hasError
              ? 'border-crimson-500 focus-visible:outline-crimson-500 bg-crimson-50/20'
              : 'border-nest-border hover:border-nest-border-strong',
            sizeClasses,
            className
          )
        )}
        {...props}
      >
        {options
          ? options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
    );
  }
);

Select.displayName = 'Select';
