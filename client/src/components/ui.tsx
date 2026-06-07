import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, LucideIcon, RefreshCcw } from "lucide-react";
import { User } from "../lib/api";
import { initials, userName } from "../lib/format";

export function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <div className="text-lg font-semibold text-slate-950">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

export function Avatar({
  user,
  size = "md",
}: {
  user?: User | null;
  size?: "sm" | "md" | "lg";
}) {
  const className =
    size === "sm"
      ? "h-8 w-8 text-xs"
      : size === "lg"
      ? "h-20 w-20 text-xl"
      : "h-11 w-11 text-sm";

  if (user?.profile?.avatarUrl) {
    return (
      <img
        className={`${className} rounded-full object-cover`}
        src={user.profile.avatarUrl}
        alt={userName(user)}
      />
    );
  }

  return (
    <div
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800`}
    >
      {initials(userName(user))}
    </div>
  );
}

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
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
        <Icon size={22} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">{text}</p>
      </div>
      {action}
    </div>
  );
}

export function InlineLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}

export function PageLoader({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="panel flex items-center gap-3 px-5 py-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
        <div>
          <div className="text-sm font-semibold text-slate-950">{label}</div>
          <div className="text-xs text-slate-500">Please wait</div>
        </div>
      </div>
    </div>
  );
}

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

type ErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
  };

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
