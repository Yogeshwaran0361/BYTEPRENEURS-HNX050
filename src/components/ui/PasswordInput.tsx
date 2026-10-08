import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  hasError?: boolean;
  sizeVariant?: 'default' | 'large';
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, hasError = false, sizeVariant = 'default', disabled, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const sizeClasses = {
      default: 'min-h-[48px] pl-4 pr-12 text-base py-2.5',
      large: 'min-h-[56px] pl-5 pr-14 text-lg py-3.5',
    }[sizeVariant];

    return (
      <div className="relative w-full">
        <input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          disabled={disabled}
          aria-invalid={hasError ? 'true' : 'false'}
          className={twMerge(
            clsx(
              'w-full rounded-tactile bg-nest-surface text-nest-ink placeholder:text-nest-ink-faint border transition-all',
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
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-nest-ink-muted hover:text-nest-ink hover:bg-nest-surface-subtle focus-visible:outline-2 focus-visible:outline-terracotta-500 transition-colors"
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Eye className="w-5 h-5" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
