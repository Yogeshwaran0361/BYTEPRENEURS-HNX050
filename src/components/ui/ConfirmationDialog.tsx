import React, { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { Button } from './Button';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'positive' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      confirmBtnRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nest-ink/40 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-desc"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-tactile-xl bg-nest-surface border border-nest-border p-6 md:p-8 shadow-tactile-lg transform transition-all"
      >
        <h2 id="dialog-title" className="text-2xl md:text-3xl font-bold text-nest-ink mb-3">
          {title}
        </h2>
        <p id="dialog-desc" className="text-lg text-nest-ink-muted mb-8 leading-relaxed">
          {description}
        </p>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sm:gap-4">
          <Button
            variant="secondary"
            size="large"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmBtnRef}
            variant={confirmVariant}
            size="large"
            onClick={onConfirm}
            isLoading={isLoading}
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
