import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastVariant = 'info' | 'success' | 'attention' | 'error';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (title: string, description?: string, variant?: ToastVariant) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((title: string, description?: string, variant: ToastVariant = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { id, title, description, variant };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast container */}
      <aside
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
      >
        {toasts.map(toast => {
          const variantClasses = {
            info: 'bg-nest-surface border-nest-border text-nest-ink',
            success: 'bg-olive-50 border-olive-200 text-olive-700',
            attention: 'bg-amberwarm-50 border-amberwarm-200 text-amberwarm-700',
            error: 'bg-crimson-50 border-crimson-200 text-crimson-700',
          }[toast.variant || 'info'];

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto p-4 rounded-tactile border shadow-tactile-md transition-all ${variantClasses}`}
            >
              <div className="font-bold text-base">{toast.title}</div>
              {toast.description && (
                <div className="text-sm mt-0.5 opacity-90">{toast.description}</div>
              )}
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
