import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, LucideIcon, RefreshCcw } from "lucide-react";
import { User } from "../lib/api";
import { initials, userName } from "../lib/format";

/* ============================================================
   METRIC — displays a numeric stat with a label
   ============================================================ */
export function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <div className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
    </div>
  );
}

/* ============================================================
   AVATAR — user photo or initials fallback
   ============================================================ */
export function Avatar({
  user,
  size = "md",
}: {
  user?: User | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "h-8 w-8 text-xs"
    : size === "lg" ? "h-20 w-20 text-xl"
    : "h-11 w-11 text-sm";

  if (user?.profile?.avatarUrl) {
    return (
      <img
        className={`${sizeClass} rounded-full object-cover ring-2 ring-[color:var(--border)] flex-shrink-0`}
        src={user.profile.avatarUrl}
        alt={userName(user)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full font-bold`}
      style={{ background: "var(--brand-light)", color: "var(--brand)" }}
    >
      {initials(userName(user))}
    </div>
  );
}

/* ============================================================
   EMPTY STATE — icon + title + description + optional action
   ============================================================ */
export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center">
      <div
        className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ background: "var(--brand-light)", color: "var(--brand)" }}
      >
        <Icon size={22} />
      </div>
      <div>
        <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h3>
        <p className="mt-1 max-w-md text-sm" style={{ color: "var(--text-muted)" }}>
          {text}
        </p>
      </div>
      {action}
    </div>
  );
}

/* ============================================================
   INLINE LOADER — small spinner with label
   ============================================================ */
export function InlineLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
      <div
        className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent flex-shrink-0"
        style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }}
      />
      <span>{label}</span>
    </div>
  );
}

/* ============================================================
   PAGE LOADER — full-screen centered loading card
   ============================================================ */
export function PageLoader({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--bg-base)" }}>
      <div className="glass flex items-center gap-4 px-6 py-5 animate-scale-in">
        {/* Animated spinner */}
        <div className="relative h-10 w-10 flex-shrink-0">
          <div
            className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }}
          />
          <div
            className="absolute inset-1.5 rounded-full border border-t-transparent animate-spin"
            style={{
              borderColor: "var(--brand-light)",
              borderTopColor: "transparent",
              animationDirection: "reverse",
              animationDuration: "0.6s",
            }}
          />
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {label}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Please wait…
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ERROR STATE — uses EmptyState with retry action
   ============================================================ */
export function ErrorState({
  title = "Something went wrong",
  text = "Refresh the page and try again.",
  onRetry,
}: {
  title?: string;
  text?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      text={text}
      action={
        onRetry ? (
          <button className="btn-secondary mt-2" type="button" onClick={onRetry}>
            <RefreshCcw size={16} />
            Retry
          </button>
        ) : null
      }
    />
  );
}

/* ============================================================
   SKELETON COMPONENTS — shimmer placeholders for loading states
   ============================================================ */

/** Generic shimmer block — pass className for sizing */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Feed card skeleton */
export function FeedCardSkeleton() {
  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="h-2.5 w-20" />
        </div>
      </div>
      <SkeletonBlock className="h-3 w-full" />
      <SkeletonBlock className="h-3 w-4/5" />
      <SkeletonBlock className="h-3 w-3/5" />
      <div className="flex gap-2 pt-1">
        <SkeletonBlock className="h-7 w-16 rounded-lg" />
        <SkeletonBlock className="h-7 w-16 rounded-lg" />
      </div>
    </div>
  );
}

/** Sidebar item skeleton */
export function SidebarItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <SkeletonBlock className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <SkeletonBlock className="h-2.5 w-28" />
        <SkeletonBlock className="h-2 w-20" />
      </div>
    </div>
  );
}

/* ============================================================
   APP ERROR BOUNDARY — catches unhandled render errors
   ============================================================ */
type ErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-10">
          <ErrorState
            text={this.state.error.message || "The page could not render."}
            onRetry={() => this.setState({ error: null })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
