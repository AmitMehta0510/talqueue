import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
  duration?: number;
};

type ToastContextValue = {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_CONFIG: Record<
  ToastType,
  { icon: typeof CheckCircle2; bg: string; border: string; text: string; progress: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle2,
    bg: "dark:bg-[#0e0d1f] bg-white",
    border: "dark:border-indigo-800/60 border-indigo-200",
    text: "dark:text-indigo-100 text-indigo-900",
    progress: "bg-indigo-500",
    iconColor: "dark:text-indigo-400 text-indigo-600",
  },
  error: {
    icon: XCircle,
    bg: "dark:bg-[#1f0d0d] bg-white",
    border: "dark:border-rose-800/60 border-rose-200",
    text: "dark:text-rose-100 text-rose-900",
    progress: "bg-rose-500",
    iconColor: "dark:text-rose-400 text-rose-600",
  },
  warning: {
    icon: AlertTriangle,
    bg: "dark:bg-[#1f1a0d] bg-white",
    border: "dark:border-amber-800/60 border-amber-200",
    text: "dark:text-amber-100 text-amber-900",
    progress: "bg-amber-500",
    iconColor: "dark:text-amber-400 text-amber-600",
  },
  info: {
    icon: Info,
    bg: "dark:bg-[#0d1520] bg-white",
    border: "dark:border-blue-800/60 border-blue-200",
    text: "dark:text-blue-100 text-blue-900",
    progress: "bg-blue-500",
    iconColor: "dark:text-blue-400 text-blue-600",
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const config = TOAST_CONFIG[toast.type];
  const Icon = config.icon;
  const duration = toast.duration ?? 4500;
  const [progress, setProgress] = useState(100);
  const [exiting, setExiting] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const startTime = useRef(Date.now());

  const handleDismiss = useCallback(() => {
    setExiting(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimeout(() => onDismiss(toast.id), 200);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (pct <= 0) {
        clearInterval(intervalRef.current!);
        handleDismiss();
      }
    }, 30);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [duration, handleDismiss]);

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border shadow-toast
        ${config.bg} ${config.border}
        ${exiting ? "animate-toast-out" : "animate-toast-in"}
        w-full max-w-sm
      `}
      role="status"
      aria-live="polite"
    >
      {/* Main content row */}
      <div className="flex items-start gap-3 px-4 py-3.5">
        <Icon
          size={18}
          className={`mt-0.5 shrink-0 ${config.iconColor}`}
        />
        <p className={`flex-1 text-sm font-medium leading-snug ${config.text}`}>
          {toast.message}
        </p>
        <button
          onClick={handleDismiss}
          className={`shrink-0 rounded-md p-0.5 opacity-50 transition-opacity hover:opacity-100 ${config.text}`}
          type="button"
          title="Dismiss"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>

      {/* Animated progress bar */}
      <div className="h-0.5 w-full bg-black/10 dark:bg-white/10">
        <div
          className={`h-full transition-none ${config.progress}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (type: ToastType, message: string, duration?: number) => {
      const id = Date.now();
      setToasts((current) => [...current.slice(-3), { id, type, message, duration }]);
    },
    [],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container — bottom-right, stacked upward */}
      <div
        className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2 w-[min(22rem,calc(100vw-2rem))]"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
