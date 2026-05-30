import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

type Toast = {
  id: number;
  type: "success" | "error";
  message: string;
};

type ToastContextValue = {
  showToast: (type: Toast["type"], message: string) => void;
  dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeouts = useRef(new Map<number, number>());

  const showToast = useCallback((type: Toast["type"], message: string) => {
    const id = Date.now();

    setToasts((current) => [...current.slice(-2), { id, type, message }]);
    const timeout = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      timeouts.current.delete(id);
    }, 4000);

    timeouts.current.set(id, timeout);
  }, []);

  const dismissToast = useCallback((id: number) => {
    const timeout = timeouts.current.get(id);

    if (timeout) {
      window.clearTimeout(timeout);
      timeouts.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo(
    () => ({ showToast, dismissToast }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = toast.type === "success" ? CheckCircle2 : XCircle;

          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm font-medium shadow-panel ${
                toast.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
              role="status"
            >
              <Icon className="mt-0.5 shrink-0" size={17} />
              <div className="min-w-0 flex-1">{toast.message}</div>
              <button
                className="rounded p-0.5 opacity-70 transition hover:opacity-100"
                type="button"
                title="Dismiss"
                onClick={() => dismissToast(toast.id)}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
