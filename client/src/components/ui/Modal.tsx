import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export interface ModalProps {
  /** Controls whether the modal is rendered. */
  isOpen: boolean;
  /** Callback fired when the modal requests to close (on escape key or click outside). */
  onClose: () => void;
  /** Optional title to render in the default header layout. */
  title?: string;
  /** Size variant. Defaults to 'lg'. */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** The content to display inside the modal. */
  children: React.ReactNode;
  /** Optional custom CSS classes for the modal panel. */
  className?: string;
  /** Accessible label description. Defaults to title if provided. */
  ariaLabel?: string;
  /** Optional flag to hide the close button when a custom header provides its own. */
  hideCloseButton?: boolean;
}

const SIZE_CLASSES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  full: "max-w-full h-full",
};

const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
    )
  ).filter((el) => el.tabIndex !== -1);
};

/**
 * A highly accessible, reusable Modal component featuring focus trapping,
 * escape key closure, overlay click detection, body scroll lock, and portal rendering.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  size = "lg",
  children,
  className = "",
  ariaLabel,
  hideCloseButton = false,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Track active element to restore focus on close
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Add scroll lock
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus initial element
    const focusable = containerRef.current ? getFocusableElements(containerRef.current) : [];
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      containerRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        if (!containerRef.current) return;
        const focusable = getFocusableElements(containerRef.current);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            lastEl.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastEl) {
            firstEl.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title || "Dialog"}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className={`relative w-full ${SIZE_CLASSES[size]} flex flex-col max-h-[90vh] z-10 glass overflow-hidden animate-scale-in outline-none ${className}`}
      >
        {/* Header (rendered if title is provided) */}
        {title ? (
          <div className="px-6 py-4 border-b border-base bg-surface-2 flex items-center justify-between shrink-0">
            <h3 className="text-base font-semibold text-primary">{title}</h3>
            <button
              onClick={onClose}
              type="button"
              className="rounded-full p-1.5 text-muted-fg hover:bg-surface-3 hover:text-primary transition"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          !hideCloseButton && (
            <button
              onClick={onClose}
              type="button"
              className="absolute right-4 top-4 z-20 rounded-full p-1.5 text-muted-fg hover:bg-surface-3 hover:text-primary transition"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          )
        )}

        {/* Modal content body */}
        <div className="overflow-y-auto flex-1 outline-none">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
