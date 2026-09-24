'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string | undefined;
  duration?: number | undefined;
}

type ToastContextType = {
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

let globalToastHandler: ((toast: Omit<ToastItem, 'id'>) => string) | null = null;
let globalToastRemover: ((id: string) => void) | null = null;

export const toast = {
  success: (title: string, description?: string, duration = 4000) => {
    if (globalToastHandler) {
      return globalToastHandler({ type: 'success', title, description, duration });
    }
  },
  error: (title: string, description?: string, duration = 5000) => {
    if (globalToastHandler) {
      return globalToastHandler({ type: 'error', title, description, duration });
    }
  },
  info: (title: string, description?: string, duration = 4000) => {
    if (globalToastHandler) {
      return globalToastHandler({ type: 'info', title, description, duration });
    }
  },
  loading: (title: string, description?: string) => {
    if (globalToastHandler) {
      return globalToastHandler({ type: 'loading', title, description, duration: 0 });
    }
  },
  dismiss: (id: string) => {
    if (globalToastRemover) {
      globalToastRemover(id);
    }
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toastData: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { ...toastData, id };
    setToasts((prev) => [...prev, newToast]);

    if (toastData.duration && toastData.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toastData.duration);
    }

    return id;
  }, [removeToast]);

  useEffect(() => {
    globalToastHandler = addToast;
    globalToastRemover = removeToast;
    return () => {
      globalToastHandler = null;
      globalToastRemover = null;
    };
  }, [addToast, removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-4 sm:p-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
              t.type === 'success'
                ? 'bg-white/95 border-emerald-200 text-neutral-900 shadow-emerald-500/5'
                : t.type === 'error'
                ? 'bg-white/95 border-rose-200 text-neutral-900 shadow-rose-500/5'
                : t.type === 'loading'
                ? 'bg-white/95 border-neutral-200 text-neutral-900'
                : 'bg-white/95 border-neutral-200 text-neutral-900'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
              {t.type === 'error' && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <AlertCircle className="h-4 w-4" />
                </div>
              )}
              {t.type === 'loading' && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-800">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              {t.type === 'info' && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Info className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold tracking-tight text-neutral-900 leading-snug">
                {t.title}
              </h4>
              {t.description && (
                <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                  {t.description}
                </p>
              )}
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-neutral-400 hover:text-neutral-700 transition -mr-1 -mt-1 p-1 rounded-lg"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
