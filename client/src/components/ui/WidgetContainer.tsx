import { ReactNode } from "react";

type WidgetContainerProps = {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

/**
 * Reusable panel widget wrapper component.
 * Standardizes styling, spring animations, margins, and headers.
 */
export function WidgetContainer({
  title,
  children,
  action,
  className = "",
}: WidgetContainerProps) {
  return (
    <div
      className={`panel flex flex-col rounded-2xl border p-4 shadow-sm transition-all duration-200 hover-lift bg-[color:var(--bg-surface)] border-[color:var(--border)] ${className}`}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-[color:var(--border)]">
        <h3 className="text-sm font-black tracking-wide text-primary uppercase">
          {title}
        </h3>
        {action && <div className="text-xs">{action}</div>}
      </div>

      {/* Widget Body */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
