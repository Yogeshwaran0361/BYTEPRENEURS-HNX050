import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'positive' | 'danger';
  size?: 'default' | 'large' | 'senior';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'default',
      fullWidth = false,
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Tactile base button styling with accessibility focus rings
    const baseClasses =
      'inline-flex items-center justify-center font-medium transition-all select-none focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.99] disabled:opacity-55 disabled:pointer-events-none disabled:active:scale-100 rounded-tactile';

    const variantClasses = {
      primary:
        'bg-terracotta-500 text-white hover:bg-terracotta-600 focus-visible:outline-terracotta-500 shadow-tactile border border-transparent font-semibold',
      secondary:
        'bg-nest-surface text-nest-ink hover:bg-nest-surface-subtle border border-nest-border hover:border-nest-border-strong focus-visible:outline-nest-ink shadow-tactile-sm',
      tertiary:
        'bg-transparent text-nest-ink hover:bg-nest-surface-subtle focus-visible:outline-nest-ink border border-transparent',
      positive:
        'bg-olive-500 text-white hover:bg-olive-600 focus-visible:outline-olive-500 shadow-tactile border border-transparent font-semibold',
      danger:
        'bg-crimson-50 text-crimson-700 hover:bg-crimson-100 border border-crimson-200 focus-visible:outline-crimson-500 font-semibold',
    }[variant];

    const sizeClasses = {
      default: 'min-h-[48px] px-5 py-2.5 text-base gap-2',
      large: 'min-h-[54px] px-6 py-3 text-lg gap-2.5 font-semibold',
      senior: 'min-h-[64px] px-8 py-4 text-xl gap-3 font-bold shadow-tactile-md', // Highest visibility for seniors
    }[size];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={twMerge(
          clsx(
            baseClasses,
            variantClasses,
            sizeClasses,
            fullWidth && 'w-full',
            className
          )
        )}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
            <span>Please wait...</span>
          </span>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
