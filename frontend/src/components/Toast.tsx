import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, AlertTriangle, XCircle, Info } from "lucide-react";

/* ════════════════════════════════════════════════════════════════
   QuizForge AI — glass toast notification system.
   Usage:
     const toast = useToast();
     toast.success("Quiz published");
     toast.error("Failed to publish quiz");
     toast.warning("Please complete all required fields");
   ════════════════════════════════════════════════════════════════ */

type ToastTone = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

let nextId = 1;

const ICONS: Record<ToastTone, ReactNode> = {
  success: <Check size={15} />,
  error: <XCircle size={15} />,
  warning: <AlertTriangle size={15} />,
  info: <Info size={15} />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-3), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  const api: ToastApi = {
    success: useCallback((m: string) => push("success", m), [push]),
    error: useCallback((m: string) => push("error", m), [push]),
    warning: useCallback((m: string) => push("warning", m), [push]),
    info: useCallback((m: string) => push("info", m), [push]),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              className={`toast toast-${toast.tone}`}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 26 }}
              onClick={() => dismiss(toast.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && dismiss(toast.id)}
            >
              <span className="toast-icon">{ICONS[toast.tone]}</span>
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}