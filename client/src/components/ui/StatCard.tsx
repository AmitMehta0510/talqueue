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
      className={`panel p-5 flex flex-col justify-between transition-all duration-300 hover-lift ${
        highlight
          ? "border-indigo-500/50 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-glow-sm"
          : "bg-surface"
      } ${className}`}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-secondary tracking-wide uppercase">
            {label}
          </p>
          <h4 className="text-2xl font-bold text-primary tracking-tight">
            {value}
          </h4>
        </div>
        {Icon && (
          <div
            className={`p-2.5 rounded-lg flex items-center justify-center ${
              highlight
                ? "bg-indigo-500/10 text-indigo-500"
                : "bg-slate-100 dark:bg-slate-900 text-muted-fg"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {trend && <div className="mt-3 flex items-center">{trend}</div>}
    </div>
  );
}
