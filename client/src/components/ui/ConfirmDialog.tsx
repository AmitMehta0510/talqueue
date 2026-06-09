import { ReactNode, useEffect, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          onClick={onCancel}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3">
          {isDanger && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <div className="mt-2 text-sm text-slate-600">{message}</div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={onCancel}
            disabled={isPending}
          >
            {cancelLabel}
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-emerald-700 hover:bg-emerald-800"
            } disabled:opacity-50`}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
