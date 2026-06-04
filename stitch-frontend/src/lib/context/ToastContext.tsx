// src/context/ToastContext.tsx

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function generateId(): string {
  // ✅ Use crypto.randomUUID() for collision-safe IDs; fallback for older envs
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, type, title, message }]);

    // Auto dismiss after 4 seconds (5 for errors to give users time to read)
    const delay = type === "error" ? 5000 : 4000;
    setTimeout(() => {
      dismiss(id);
    }, delay);
  }, [dismiss]);

  const success = useCallback(
    (title: string, message?: string) => addToast("success", title, message),
    [addToast]
  );
  const error = useCallback(
    (title: string, message?: string) => addToast("error", title, message),
    [addToast]
  );
  const info = useCallback(
    (title: string, message?: string) => addToast("info", title, message),
    [addToast]
  );
  const warning = useCallback(
    (title: string, message?: string) => addToast("warning", title, message),
    [addToast]
  );

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />,
    error: <AlertCircle size={16} className="text-red-600 flex-shrink-0" />,
    info: <Info size={16} className="text-blue-600 flex-shrink-0" />,
    warning: <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />,
  };

  const borders: Record<ToastType, string> = {
    success: "border-l-emerald-500",
    error: "border-l-red-500",
    info: "border-l-blue-500",
    warning: "border-l-amber-400",
  };

  // ✅ aria-live="assertive" for errors, "polite" for non-critical notifications
  return (
    <ToastContext.Provider value={{ success, error, info, warning, dismiss }}>
      {children}

      {/* ✅ Accessibility: role="region" + aria-label makes this a landmark;
          aria-live="polite" lets screen readers announce toasts without interrupting */}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
        className="fixed bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-[9999] flex flex-col gap-3 max-w-[340px] sm:max-w-md pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            aria-live={t.type === "error" ? "assertive" : "polite"}
            aria-atomic="true"
            className={`pointer-events-auto flex items-start gap-3 bg-white border border-stone-200/80 border-l-4 ${borders[t.type]} shadow-xl px-4 py-3.5 rounded-lg animate-slide-in-up transition-all`}
          >
            <div className="mt-0.5">{icons[t.type]}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-stone-900">{t.title}</h4>
              {t.message && (
                <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">
                  {t.message}
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-stone-300 hover:text-stone-600 transition-colors flex-shrink-0 mt-0.5"
              aria-label={`Dismiss: ${t.title}`}
            >
              <X size={12} />
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
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
