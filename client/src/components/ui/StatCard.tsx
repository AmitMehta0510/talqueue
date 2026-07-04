import React from "react";
import { LucideIcon } from "lucide-react";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The title label of the metric. */
  label: string;
  /** The value to display (e.g. number or percentage string). */
  value: string | number;
  /** Optional icon to display inside the card. */
  icon?: LucideIcon;
  /** Optional badge or trend indicator content. */
  trend?: React.ReactNode;
  /** If true, applies brand glow styling border overrides. */
  highlight?: boolean;
}

/**
 * A highly reusable dashboard StatCard component matching the design spec's
 * high-density metric overview panels.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  highlight = false,
  className = "",
  ...props
}: StatCardProps) {
  return (
    <div
      className={`panel p-4 flex items-center gap-4 transition-all duration-300 hover-lift border rounded-2xl ${
        highlight
          ? "border-indigo-500/50 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-glow-sm"
          : "bg-[color:var(--bg-surface)] border-[color:var(--border)]"
      } ${className}`}
      {...props}
    >
      {Icon && (
        <div
          className={`p-3 rounded-xl flex items-center justify-center shrink-0 ${
            highlight
              ? "bg-indigo-500/20 text-indigo-400"
              : "bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="space-y-0.5 min-w-0">
        <h4 className="text-xl font-black text-primary tracking-tight truncate">
          {value}
        </h4>
        <p className="text-[11px] font-bold text-secondary tracking-wide truncate">
          {label}
        </p>
      </div>
      {trend && <div className="ml-auto shrink-0">{trend}</div>}
    </div>
  );
}
