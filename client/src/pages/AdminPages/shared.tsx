import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, ChevronDown, X } from "lucide-react";
import { titleCase, userName } from "../../core/utils/format";
import { useAdminUsersQuery } from "../../hooks/usePlatformQueries";
import { Avatar } from "../../components/ui";

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const fmtRelative = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return fmtDate(d);
};

// ─── STATUS BADGE ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const adminColors: Record<string, string> = {
    ACTIVE: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 ring-indigo-500/30",
    BANNED: "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-rose-500/30",
    INACTIVE: "bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/30",
    OPEN: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/30",
    DRAFT: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30",
    CLOSED: "bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/30",
    COMPLETED: "bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-purple-500/30",
    ARCHIVED: "bg-slate-600/15 text-slate-600 dark:text-slate-500 ring-slate-600/30",
    ACCEPTED: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 ring-indigo-500/30",
    REJECTED: "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-rose-500/30",
    PENDING: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30",
  };

  const cls = adminColors[status.toUpperCase()] || "bg-slate-500/15 text-slate-500 ring-slate-500/30";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${cls}`}>
      {status}
    </span>
  );
}

// ─── SEARCH BAR ────────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: "var(--text-muted)" }} />
      <input
        className="field pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ─── KPI CARD ──────────────────────────────────────────────────────────────────
export function KpiCard({ label, value, icon: Icon, gradient, sub }: {
  label: string; value: number | string; icon: any; gradient: string; sub?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${gradient} opacity-10`} />
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${gradient}`}>
        <Icon size={16} className="text-white" />
      </div>
      <div className="text-2xl font-black leading-none" style={{ color: "var(--text-primary)" }}>{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</div>
      {sub && <div className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

// ─── DIST BAR ──────────────────────────────────────────────────────────────────
export function DistBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>{titleCase(label)}</span>
        <span style={{ color: "var(--text-muted)" }}>{count.toLocaleString()} ({pct}%)</span>
      </div>
      <div className="h-1.5 w-full rounded-full" style={{ background: "var(--border)" }}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ─── DATA TABLE ────────────────────────────────────────────────────────────────
export function DataTable({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty?: boolean }) {
  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 rounded-full p-4" style={{ background: "var(--bg-surface-2)" }}><Search size={20} style={{ color: "var(--text-muted)" }} /></div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No records found</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--border)" }}>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y text-xs" style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}>
          {children}
        </tbody>
      </table>
    </div>
  );
}

// ─── LOAD MORE ─────────────────────────────────────────────────────────────────
export function LoadMoreBtn({ query }: { query: any }) {
  if (!query.hasNextPage) return null;
  return (
    <div className="flex justify-center pt-3">
      <button
        className="btn-secondary text-xs disabled:opacity-50"
        onClick={() => query.fetchNextPage()}
        disabled={query.isFetchingNextPage}
      >
        {query.isFetchingNextPage ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} />}
        Load more
      </button>
    </div>
  );
}

// ─── USER SEARCH AUTOCOMPLETE ──────────────────────────────────────────────────
export function UserSearchAutocomplete({
  value,
  onChange,
  placeholder = "Search user by name, username, or email...",
}: {
  value: string;
  onChange: (userId: string, label: string) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; username: string; avatarUrl?: string | null } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const usersQuery = useAdminUsersQuery(search);
  const pages = usersQuery.data?.pages || [];
  const matchedUsers = pages.flatMap((page) => page?.users || []).slice(0, 5);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (user: any) => {
    const nameLabel = userName(user);
    setSelectedUser({
      id: user.id,
      name: nameLabel,
      username: user.username,
      avatarUrl: user.profile?.avatarUrl
    });
    onChange(user.id, nameLabel);
    setShowDropdown(false);
    setSearch("");
  };

  const handleClear = () => {
    setSelectedUser(null);
    onChange("", "");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {selectedUser ? (
        <div className="flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-500/5 px-3 py-2 text-xs transition duration-150">
          <div className="flex items-center gap-2">
            <Avatar user={{ username: selectedUser.username, profile: { avatarUrl: selectedUser.avatarUrl } } as any} size="sm" />
            <div>
              <div className="font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{selectedUser.name}</div>
              <div className="text-[10px] leading-tight" style={{ color: "var(--text-muted)" }}>@{selectedUser.username}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="icon-btn h-6 w-6"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            className="field pl-9 pr-8 text-xs"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder={placeholder}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 transition"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={12} />
            </button>
          )}

          {showDropdown && search.trim().length >= 1 && (
            <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border shadow-2xl py-1 animate-in fade-in duration-105" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
              {usersQuery.isPending ? (
                <div className="flex items-center justify-center py-4 gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <Loader2 size={12} className="animate-spin text-indigo-500" />
                  Searching users...
                </div>
              ) : matchedUsers.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs italic" style={{ color: "var(--text-muted)" }}>No users found</div>
              ) : (
                matchedUsers.map((user: any) => {
                  const label = userName(user);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelect(user)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[var(--bg-surface-2)]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <Avatar user={user} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate leading-tight" style={{ color: "var(--text-primary)" }}>{label}</div>
                        <div className="text-[10px] truncate leading-tight" style={{ color: "var(--text-muted)" }}>@{user.username} · {user.email}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
