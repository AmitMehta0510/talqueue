import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2, Users, ShieldCheck, ChevronRight, CheckCircle, Ban,
  ShieldAlert, ExternalLink, Mail, ChevronDown,
} from "lucide-react";
import { useAdminUsersQuery } from "../../hooks/usePlatformQueries";
import { Avatar } from "../../components/ui";
import { SearchBar, StatusBadge, fmtDate } from "./shared";
import { titleCase, userName, getHighestPrivilegeRole } from "../../lib/format";

export function UsersPanel({
  onAction,
  currentUserId,
  isSuperAdmin,
}: {
  onAction: (type: "ban" | "activate" | "grant_admin" | "revoke_admin", userId: string, label: string) => void;
  currentUserId?: string;
  isSuperAdmin?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const usersQuery = useAdminUsersQuery(search);

  const pages = usersQuery.data?.pages || [];
  const users = pages.flatMap((page) => page?.users || []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>User Management</h2>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{users.length} loaded</span>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, username, email..." />

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        {usersQuery.isPending ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Users size={32} className="mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No users match the filter.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {users.map((u) => {
              const isBanned = u.status === "BANNED";
              const isSuperAdminUser = u.roles?.some((ur: any) => ur.role?.name === "SUPER_ADMIN");
              const isPlatformAdmin = u.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN");
              const isCollegeAdmin = u.roles?.some((ur: any) => ur.role?.name === "COLLEGE_ADMIN");
              const isCompanyAdmin = u.roles?.some((ur: any) => ur.role?.name === "COMPANY_ADMIN");
              const label = userName(u);
              const isExpanded = expandedUser === u.id;

              return (
                <div key={u.id}>
                  <div className={`flex items-center gap-4 px-5 py-4 transition hover:bg-[var(--bg-surface-2)] ${isBanned ? "opacity-70" : ""}`}>
                    {/* Avatar + info */}
                    <Link to={`/users/${u.username || u.id}`} className="shrink-0">
                      <Avatar user={u} size="md" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>{label}</span>
                        {isSuperAdminUser && (
                          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-black bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            <ShieldCheck size={8} /> SUPER_ADMIN
                          </span>
                        )}
                        {isPlatformAdmin && !isSuperAdminUser && (
                          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-black bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                            <ShieldCheck size={8} /> PLATFORM_ADMIN
                          </span>
                        )}
                        {isCollegeAdmin && (
                          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            COLLEGE_ADMIN
                          </span>
                        )}
                        {isCompanyAdmin && (
                          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            COMPANY_ADMIN
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-[11px] flex-wrap" style={{ color: "var(--text-muted)" }}>
                        <span>@{u.username}</span>
                        <span>·</span>
                        <span className="truncate">{u.email}</span>
                        <span>·</span>
                        <StatusBadge status={u.status || "ACTIVE"} />
                        <span>·</span>
                        <span>{u.createdAt ? fmtDate(u.createdAt) : ""}</span>
                      </div>
                      {u.profile?.college && (
                        <div className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>{u.profile.college.name}</div>
                      )}
                      {u._count && (
                        <div className="mt-1 flex gap-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
                           <span>{u._count.posts ?? 0} posts</span>
                           <span>{u._count.projectMemberships ?? 0} projects</span>
                           <span>{u._count.followers ?? 0} followers</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        className="icon-btn h-8 w-8"
                        onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                        title="Toggle details"
                      >
                        <ChevronRight size={14} className={`transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </button>

                      {isBanned ? (
                        <button
                          className="flex items-center gap-1 rounded-lg border border-indigo-700/50 bg-indigo-500/10 px-2.5 py-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition"
                          onClick={() => onAction("activate", u.id, label)}
                        >
                          <CheckCircle size={11} /> Activate
                        </button>
                      ) : !isSuperAdminUser && (
                        <button
                          className="flex items-center gap-1 rounded-lg border border-rose-700/50 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition disabled:opacity-30"
                          onClick={() => onAction("ban", u.id, label)}
                          disabled={u.id === currentUserId}
                        >
                          <Ban size={11} /> Ban
                        </button>
                      )}

                      {/* Admin grant/revoke — SUPER_ADMIN only */}
                      {isSuperAdmin && (
                        isPlatformAdmin ? (
                          <button
                            className="flex items-center gap-1 rounded-lg border border-red-700/50 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition disabled:opacity-30"
                            onClick={() => onAction("revoke_admin", u.id, label)}
                            disabled={u.id === currentUserId}
                          >
                            <ShieldAlert size={11} /> Revoke Admin
                          </button>
                        ) : (
                          <button
                            className="btn-secondary px-2.5 py-1.5 text-[11px] disabled:opacity-30"
                            onClick={() => onAction("grant_admin", u.id, label)}
                            disabled={isBanned}
                          >
                            <ShieldCheck size={11} /> Make Admin
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Expanded User Detail */}
                  {isExpanded && (
                    <div className="border-t px-5 py-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                      <div className="grid gap-4 md:grid-cols-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                        <div>
                          <div className="mb-2 font-bold uppercase tracking-wider text-[10px]" style={{ color: "var(--text-muted)" }}>Identity</div>
                          <div className="space-y-1">
                            <div><span style={{ color: "var(--text-muted)" }}>Trust Level: </span><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{titleCase(u.trustLevel || "BEGINNER")}</span></div>
                            <div><span style={{ color: "var(--text-muted)" }}>Type: </span><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{titleCase(u.primaryRole || "USER")}</span></div>
                            <div><span style={{ color: "var(--text-muted)" }}>Highest Role: </span><span className="font-semibold" style={{ color: "var(--text-primary)" }}>{titleCase(getHighestPrivilegeRole(u) || "USER")}</span></div>
                            <div><span style={{ color: "var(--text-muted)" }}>Joined: </span><span style={{ color: "var(--text-primary)" }}>{u.createdAt ? fmtDate(u.createdAt) : ""}</span></div>
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 font-bold uppercase tracking-wider text-[10px]" style={{ color: "var(--text-muted)" }}>Platform Roles</div>
                          <div className="flex flex-wrap gap-1">
                            {u.roles && u.roles.length > 0
                              ? u.roles.map((ur: any) => (
                                  <span key={ur.role?.name} className="chip">
                                    {ur.role?.name}
                                  </span>
                                ))
                              : <span className="italic" style={{ color: "var(--text-muted)" }}>No special roles</span>
                            }
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 font-bold uppercase tracking-wider text-[10px]" style={{ color: "var(--text-muted)" }}>Activity</div>
                          <div className="space-y-1">
                            {u._count && (
                              <>
                                <div><span style={{ color: "var(--text-muted)" }}>Posts: </span><span style={{ color: "var(--text-primary)" }}>{u._count.posts ?? 0}</span></div>
                                <div><span style={{ color: "var(--text-muted)" }}>Projects: </span><span style={{ color: "var(--text-primary)" }}>{u._count.projectMemberships ?? 0}</span></div>
                                <div><span style={{ color: "var(--text-muted)" }}>Followers: </span><span style={{ color: "var(--text-primary)" }}>{u._count.followers ?? 0}</span></div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Link
                          to={`/users/${u.username || u.id}`}
                          className="btn-secondary text-[11px] px-3 py-1.5"
                        >
                          <ExternalLink size={10} /> View Profile
                        </Link>
                        <a
                          href={`mailto:${u.email}`}
                          className="btn-secondary text-[11px] px-3 py-1.5"
                        >
                          <Mail size={10} /> Email User
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {usersQuery.hasNextPage && (
          <div className="border-t p-4" style={{ borderColor: "var(--border)" }}>
            <button
              className="btn-secondary w-full disabled:opacity-50"
              onClick={() => usersQuery.fetchNextPage()}
              disabled={usersQuery.isFetchingNextPage}
            >
              {usersQuery.isFetchingNextPage ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} />}
              Load more users
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
