import { LucideIcon } from "lucide-react";
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
  size?: "sm" | "md";
}) {
  const className = size === "sm" ? "h-8 w-8 text-xs" : "h-11 w-11 text-sm";

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
}: {
  icon: LucideIcon;
  title: string;
  text: string;
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
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
    </div>
  );
}
