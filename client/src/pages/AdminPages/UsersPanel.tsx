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
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">User Management</h2>
        <span className="text-xs text-zinc-600">{users.length} loaded</span>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, username, email..." />

      <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
        {usersQuery.isPending ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Users size={32} className="mb-3 text-zinc-600" />
            <p className="text-sm text-zinc-500">No users match the filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
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
                  <div className={`flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/40 transition ${isBanned ? "opacity-70" : ""}`}>
                    {/* Avatar + info */}
                    <Link to={`/users/${u.id}`} className="shrink-0">
                      <Avatar user={u} size="md" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white truncate">{label}</span>
                        {isSuperAdminUser && (
                          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-black bg-purple-500/15 text-purple-400 border border-purple-500/20">
                            <ShieldCheck size={8} /> SUPER_ADMIN
                          </span>
                        )}
                        {isPlatformAdmin && !isSuperAdminUser && (
                          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-black bg-red-500/15 text-red-400 border border-red-500/20">
                            <ShieldCheck size={8} /> PLATFORM_ADMIN
                          </span>
                        )}
                        {isCollegeAdmin && (
                          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-black bg-blue-500/15 text-blue-400 border border-blue-500/20">
                            COLLEGE_ADMIN
                          </span>
                        )}
                        {isCompanyAdmin && (
                          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/20">
                            COMPANY_ADMIN
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-[11px] text-zinc-500">
                        <span>@{u.username}</span>
                        <span>·</span>
                        <span className="truncate">{u.email}</span>
                        <span>·</span>
                        <StatusBadge status={u.status || "ACTIVE"} />
                        <span>·</span>
                        <span>{u.createdAt ? fmtDate(u.createdAt) : ""}</span>
                      </div>
                      {u.profile?.college && (
                        <div className="mt-0.5 text-[11px] text-zinc-600">{u.profile.college.name}</div>
                      )}
                      {u._count && (
                        <div className="mt-1 flex gap-3 text-[10px] text-zinc-600">
                           <span>{u._count.posts ?? 0} posts</span>
                           <span>{u._count.projectMemberships ?? 0} projects</span>
                           <span>{u._count.followers ?? 0} followers</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        className="rounded p-1.5 text-zinc-600 hover:bg-zinc-700 hover:text-zinc-200 transition"
                        onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                        title="Toggle details"
                      >
                        <ChevronRight size={14} className={`transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </button>

                      {isBanned ? (
                        <button
                          className="flex items-center gap-1 rounded-lg border border-emerald-700/50 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition"
                          onClick={() => onAction("activate", u.id, label)}
                        >
                          <CheckCircle size={11} /> Activate
                        </button>
                      ) : !isSuperAdminUser && (
                        <button
                          className="flex items-center gap-1 rounded-lg border border-rose-700/50 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-bold text-rose-400 hover:bg-rose-500/20 transition disabled:opacity-30"
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
                            className="flex items-center gap-1 rounded-lg border border-red-700/50 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-500/20 transition disabled:opacity-30"
                            onClick={() => onAction("revoke_admin", u.id, label)}
                            disabled={u.id === currentUserId}
                          >
                            <ShieldAlert size={11} /> Revoke Admin
                          </button>
                        ) : (
                          <button
                            className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/60 px-2.5 py-1.5 text-[11px] font-bold text-zinc-300 hover:border-emerald-600 hover:text-emerald-400 transition disabled:opacity-30"
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
                    <div className="border-t border-zinc-800/60 bg-zinc-900/60 px-5 py-4">
                      <div className="grid gap-4 md:grid-cols-3 text-xs text-zinc-400">
                        <div>
                          <div className="mb-2 font-bold uppercase tracking-wider text-zinc-500 text-[10px]">Identity</div>
                          <div className="space-y-1">
                            <div><span className="text-zinc-600">Trust Level: </span><span className="text-zinc-200 font-semibold">{titleCase(u.trustLevel || "BEGINNER")}</span></div>
                            <div><span className="text-zinc-600">Type: </span><span className="text-zinc-200 font-semibold">{titleCase(u.primaryRole || "USER")}</span></div>
                            <div><span className="text-zinc-600">Highest Role: </span><span className="text-zinc-200 font-semibold">{titleCase(getHighestPrivilegeRole(u) || "USER")}</span></div>
                            <div><span className="text-zinc-600">Joined: </span><span className="text-zinc-200">{u.createdAt ? fmtDate(u.createdAt) : ""}</span></div>
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 font-bold uppercase tracking-wider text-zinc-500 text-[10px]">Platform Roles</div>
                          <div className="flex flex-wrap gap-1">
                            {u.roles && u.roles.length > 0
                              ? u.roles.map((ur: any) => (
                                  <span key={ur.role?.name} className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-zinc-800 border border-zinc-700 text-zinc-300">
                                    {ur.role?.name}
                                  </span>
                                ))
                              : <span className="text-zinc-600 italic">No special roles</span>
                            }
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 font-bold uppercase tracking-wider text-zinc-500 text-[10px]">Activity</div>
                          <div className="space-y-1">
                            {u._count && (
                              <>
                                <div><span className="text-zinc-600">Posts: </span><span className="text-zinc-200">{u._count.posts ?? 0}</span></div>
                                <div><span className="text-zinc-600">Projects: </span><span className="text-zinc-200">{u._count.projectMemberships ?? 0}</span></div>
                                <div><span className="text-zinc-600">Followers: </span><span className="text-zinc-200">{u._count.followers ?? 0}</span></div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Link
                          to={`/users/${u.id}`}
                          className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 hover:border-emerald-600 hover:text-emerald-400 transition"
                        >
                          <ExternalLink size={10} /> View Profile
                        </Link>
                        <a
                          href={`mailto:${u.email}`}
                          className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 hover:border-blue-600 hover:text-blue-400 transition"
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
          <div className="border-t border-zinc-800/60 p-4">
            <button
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-700 py-2 text-xs font-semibold text-zinc-400 hover:border-emerald-600 hover:text-emerald-400 transition disabled:opacity-50"
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
