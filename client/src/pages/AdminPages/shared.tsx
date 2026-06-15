import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, ChevronDown, X } from "lucide-react";
import { titleCase, userName } from "../../lib/format";
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
  const variants: Record<string, string> = {
    ACTIVE: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
    BANNED: "bg-rose-500/15 text-rose-400 ring-rose-500/30",
    INACTIVE: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30",
    OPEN: "bg-blue-500/15 text-blue-400 ring-blue-500/30",
    DRAFT: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
    CLOSED: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30",
    COMPLETED: "bg-purple-500/15 text-purple-400 ring-purple-500/30",
    ARCHIVED: "bg-zinc-600/15 text-zinc-500 ring-zinc-600/30",
    ACCEPTED: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
    REJECTED: "bg-rose-500/15 text-rose-400 ring-rose-500/30",
    PENDING: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${variants[status] || "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30"}`}>
      {status}
    </span>
  );
}

// ─── SEARCH BAR ────────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
      <input
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
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
    <div className="relative overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${gradient} opacity-10`} />
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${gradient}`}>
        <Icon size={16} className="text-white" />
      </div>
      <div className="text-2xl font-black text-white leading-none">{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div className="mt-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</div>
      {sub && <div className="mt-1 text-[10px] text-zinc-500">{sub}</div>}
    </div>
  );
}

// ─── DIST BAR ──────────────────────────────────────────────────────────────────
export function DistBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-zinc-300">{titleCase(label)}</span>
        <span className="text-zinc-500">{count.toLocaleString()} ({pct}%)</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-700/60">
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
        <div className="mb-3 rounded-full bg-zinc-800 p-4"><Search size={20} className="text-zinc-500" /></div>
        <p className="text-sm text-zinc-500">No records found</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-700/50">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-zinc-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/80 text-xs text-zinc-300">
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
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-xs font-semibold text-zinc-300 hover:border-emerald-600 hover:text-emerald-400 transition disabled:opacity-50"
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
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs transition duration-150">
          <div className="flex items-center gap-2">
            <Avatar user={{ username: selectedUser.username, profile: { avatarUrl: selectedUser.avatarUrl } } as any} size="sm" />
            <div>
              <div className="font-semibold text-white leading-tight">{selectedUser.name}</div>
              <div className="text-[10px] text-zinc-550 leading-tight">@{selectedUser.username}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
          <input
            type="text"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 pl-9 pr-8 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
            >
              <X size={12} />
            </button>
          )}

          {showDropdown && search.trim().length >= 1 && (
            <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl py-1 animate-in fade-in duration-105">
              {usersQuery.isPending ? (
                <div className="flex items-center justify-center py-4 text-zinc-500 gap-2 text-xs">
                  <Loader2 size={12} className="animate-spin text-emerald-500" />
                  Searching users...
                </div>
              ) : matchedUsers.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs text-zinc-600 italic">No users found</div>
              ) : (
                matchedUsers.map((user: any) => {
                  const label = userName(user);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelect(user)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                    >
                      <Avatar user={user} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate text-white leading-tight">{label}</div>
                        <div className="text-[10px] text-zinc-500 truncate leading-tight">@{user.username} · {user.email}</div>
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
