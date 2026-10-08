import React from 'react';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';

export interface StepItem {
  id: number;
  label: string;
}

export interface StepProgressProps {
  steps: StepItem[];
  currentStep: number;
  className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({ steps, currentStep, className }) => {
  return (
    <nav aria-label="Registration steps" className={clsx('w-full py-4', className)}>
      <ol className="flex items-center justify-between max-w-xl mx-auto relative">
        {/* Background track line */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-6 right-6 h-1 bg-nest-border -z-1"
          aria-hidden="true"
        />

        {steps.map(step => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <li
              key={step.id}
              className="flex flex-col items-center relative select-none"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold text-base transition-colors border-2 shadow-tactile-sm',
                  isCompleted && 'bg-olive-500 border-olive-500 text-white',
                  isCurrent && 'bg-terracotta-500 border-terracotta-500 text-white ring-4 ring-terracotta-100',
                  !isCompleted && !isCurrent && 'bg-nest-surface border-nest-border text-nest-ink-muted'
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <span
                className={clsx(
                  'text-xs sm:text-sm font-semibold mt-2 text-center whitespace-nowrap',
                  isCurrent ? 'text-nest-ink font-bold' : 'text-nest-ink-muted'
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
