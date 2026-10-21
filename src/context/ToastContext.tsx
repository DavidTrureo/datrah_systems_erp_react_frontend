import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextProps {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      const newToast: ToastItem = { id, type, title, message };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const showSuccess = useCallback((msg: string, title?: string) => showToast(msg, 'success', title), [showToast]);
  const showError = useCallback((msg: string, title?: string) => showToast(msg, 'error', title), [showToast]);
  const showWarning = useCallback((msg: string, title?: string) => showToast(msg, 'warning', title), [showToast]);
  const showInfo = useCallback((msg: string, title?: string) => showToast(msg, 'info', title), [showToast]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-sky-400 shrink-0" />;
    }
  };

  const getColors = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/40 bg-slate-900/90 text-emerald-100 shadow-emerald-500/10';
      case 'error':
        return 'border-rose-500/40 bg-slate-900/90 text-rose-100 shadow-rose-500/10';
      case 'warning':
        return 'border-amber-500/40 bg-slate-900/90 text-amber-100 shadow-amber-500/10';
      case 'info':
      default:
        return 'border-sky-500/40 bg-slate-900/90 text-sky-100 shadow-sky-500/10';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      {/* Container de Toasts Flotantes */}
      <div 
        className="fixed z-[99999] flex flex-col gap-3 pointer-events-none transition-all px-4 sm:px-0 w-full max-w-[420px] left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0"
        style={{
          top: 'calc(68px + env(safe-area-inset-top, 0px))'
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-in slide-in-from-top-3 fade-in ${getColors(
              toast.type
            )}`}
          >
            {getIcon(toast.type)}
            <div className="flex-1 min-w-0">
              {toast.title && <h5 className="font-semibold text-sm mb-0.5 text-white">{toast.title}</h5>}
              <p className="text-xs leading-relaxed opacity-90 break-words">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors p-1 -mr-1 -mt-1 rounded-lg"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
  }
  return context;
};
