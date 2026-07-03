import { ReactNode } from "react";

type BaseRightPanelProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Reusable Right Panel component. Renders as a sticky sidebar on the right
 * side of the screen on desktop viewports (xl and above).
 */
export function BaseRightPanel({ children, className = "" }: BaseRightPanelProps) {
  return (
    <aside
      className={`hidden xl:flex xl:flex-col border-l h-[calc(100vh-4rem)] sticky top-16 shrink-0 overflow-y-auto p-4 space-y-6 bg-[color:var(--bg-surface)] border-[color:var(--border)] scrollbar-none ${className}`}
      style={{ width: "20rem" }}
    >
      {children}
    </aside>
  );
}
