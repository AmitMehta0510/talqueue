import React from "react";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral" | "primary";
export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The semantic color variant of the badge. Defaults to 'neutral'. */
  variant?: BadgeVariant;
  /** The size variant of the badge. Defaults to 'md'. */
  size?: BadgeSize;
  /** Optional icon to render inside the badge, placed before the text content. */
  icon?: React.ReactNode;
  /** The content of the badge. */
  children?: React.ReactNode;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
  warning: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
  danger: "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50",
  info: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50",
  neutral: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
  primary: "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-xs",
  lg: "px-2.5 py-1 text-sm",
};

/**
 * A highly reusable, fully styled semantic Badge component supporting different sizes,
 * variants, and icons matching the design system specifications.
 */
export function Badge({
  variant = "neutral",
  size = "md",
  icon,
  children,
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-colors duration-150 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {icon && <span className="flex shrink-0 items-center justify-center">{icon}</span>}
      {children}
    </span>
  );
}
