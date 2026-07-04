import React from "react";
import { X } from "lucide-react";

export interface FilterChipProps extends React.HTMLAttributes<HTMLButtonElement> {
  /** The text label of the filter chip. */
  label: string;
  /** Callback fired when the clear/dismiss button is clicked. */
  onDismiss: () => void;
  /** Optional icon rendered before the label. */
  icon?: React.ReactNode;
  /** Optional flag to disable the filter chip interactions. */
  disabled?: boolean;
}

/**
 * A highly reusable, keyboard-accessible FilterChip component for rendering
 * active filter states with clear/dismiss vectors.
 */
export function FilterChip({
  label,
  onDismiss,
  icon,
  disabled = false,
  className = "",
  ...props
}: FilterChipProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      onDismiss();
    }
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onKeyDown={handleKeyDown}
      onClick={onDismiss}
      className={`chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border-base bg-surface-2 text-secondary hover:bg-surface-3 transition-colors active:scale-95 duration-150 focus:outline-none focus:border-brand-focus focus:ring-1 focus:ring-brand-glow disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      aria-label={`Remove filter: ${label}`}
      {...props}
    >
      {icon && <span className="flex shrink-0 items-center justify-center">{icon}</span>}
      <span>{label}</span>
      <span className="flex shrink-0 items-center justify-center p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
        <X className="h-3 w-3" />
      </span>
    </button>
  );
}
