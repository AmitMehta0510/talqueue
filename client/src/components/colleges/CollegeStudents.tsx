import React from "react";
import { Shield, Loader2, Trash2, UserPlus, Search } from "lucide-react";
import { EmptyState } from "../ui";
import { CdcrMember, User } from "../../lib/api";
import { formatDate, cleanLogoUrl } from "../../core/utils/format";

export interface CollegeStudentsProps {
  cdcrMembers: CdcrMember[];
  isCdcrMembersLoading: boolean;
  onAssignCdcrMember: (userId: string) => void;
  isAssignCdcrMemberPending: boolean;
  onRemoveCdcrMember: (userId: string) => void;
  isRemoveCdcrMemberPending: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: User[];
  isSearchResultsLoading: boolean;
  isUserTpo: boolean;
}

export function CollegeStudents({
  cdcrMembers,
  isCdcrMembersLoading,
  onAssignCdcrMember,
  isAssignCdcrMemberPending,
  onRemoveCdcrMember,
  isRemoveCdcrMemberPending,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearchResultsLoading,
  isUserTpo,
}: CollegeStudentsProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_23rem]">
      {/* CDCR Members Roster */}
      <div className="panel p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
            <Shield size={16} className="text-indigo-600" />
            CDCR Representatives
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Roster of student/faculty coordinators authorized to manage placement drives.
          </p>
        </div>

        {isCdcrMembersLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-slate-400" size={20} />
          </div>
        ) : cdcrMembers.length ? (
          <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
            <table className="w-full border-collapse text-left text-xs">
              <thead className="text-[10px] font-bold uppercase tracking-wider" style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}>
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Assigned Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                {cdcrMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 flex items-center gap-2.5">
                      {cleanLogoUrl(member.user?.profile?.avatarUrl) ? (
                        <img
                          src={cleanLogoUrl(member.user?.profile?.avatarUrl)!}
                          alt={member.user?.profile?.fullName || undefined}
                          className="h-8 w-8 rounded-full object-cover border border-slate-100 shadow-sm"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full font-bold" style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}>
                          {member.user?.profile?.fullName?.charAt(0) || "U"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold truncate" style={{ color: "var(--text-primary)" }}>
                          {member.user?.profile?.fullName || "User"}
                        </p>
                        <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                          @{member.user?.username}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>
                      {member.user?.email}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(member.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Revoke CDCR assignment for ${member.user?.profile?.fullName || member.user?.username}?`)) {
                            onRemoveCdcrMember(member.userId);
                          }
                        }}
                        disabled={isRemoveCdcrMemberPending}
                        className="transition p-1 rounded-lg" style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#e11d48")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                        title="Revoke access"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Shield}
            title="No CDCR representatives yet"
            text="Search and assign students to help coordinate placement drives."
          />
        )}
      </div>

      {/* Search & Assign Panel — only shown to TPO or CollegeAdmin (not CDCR-only) */}
      {isUserTpo && (
        <aside className="panel p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
              <UserPlus size={16} className="text-indigo-600" />
              Assign CDCR Member
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Search students of this college to grant CDCR coordination permissions.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none" style={{ color: "var(--text-muted)" }}>
              <Search size={14} />
            </div>
            <input
              type="text"
              className="field pl-9 w-full text-xs"
              placeholder="Search by name, email, or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {searchQuery.trim().length >= 2 ? (
            isSearchResultsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-slate-400" size={16} />
              </div>
            ) : searchResults.length ? (
              <div className="rounded-xl border divide-y max-h-60 overflow-y-auto shadow-inner" style={{ borderColor: "var(--border)", background: "var(--bg-surface)", borderTop: "none" }}>
                {searchResults.map((student) => {
                  const isAlreadyCdcr = cdcrMembers.some((m) => m.userId === student.id);
                  return (
                    <div key={student.id} className="p-3 flex items-center justify-between gap-3 transition-colors" style={{ borderColor: "var(--border)" }}>
                      <div className="flex items-center gap-2 min-w-0">
                        {cleanLogoUrl(student.profile?.avatarUrl) ? (
                          <img
                            src={cleanLogoUrl(student.profile?.avatarUrl)!}
                            alt={student.profile?.fullName || undefined}
                            className="h-7 w-7 rounded-full object-cover border border-slate-100"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}>
                            {student.profile?.fullName?.charAt(0) || "U"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                            {student.profile?.fullName || "User"}
                          </p>
                          <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                            @{student.username}
                          </p>
                        </div>
                      </div>

                      {isAlreadyCdcr ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                          CDCR
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAssignCdcrMember(student.id)}
                          disabled={isAssignCdcrMemberPending}
                          className="flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2 py-1 transition disabled:opacity-50"
                        >
                          Assign
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>No matching students found.</p>
            )
          ) : searchQuery.trim().length > 0 ? (
            <p className="text-[10px] text-center py-2" style={{ color: "var(--text-muted)" }}>Type at least 2 characters to search.</p>
          ) : null}
        </aside>
      )}
    </div>
  );
}
