/**
 * TpoCdcrTab.tsx
 *
 * Uses the existing CDCR infrastructure:
 *  - useCdcrMembersQuery       → GET /colleges/:id/tpo/cdcr
 *  - useAssignCdcrMemberMutation → POST /colleges/:id/tpo/cdcr  { userId }
 *  - useRemoveCdcrMemberMutation → DELETE /colleges/:id/tpo/cdcr/:userId
 *  - api.searchCollegeStudents   → GET /colleges/:id/tpo/students?q=...
 *
 * The existing assignCdcrMember service in colleges.service.ts already:
 *  - validates the user exists
 *  - prevents duplicates (with dept-null handling)
 *  - sends a "CDCR Representative Assigned" notification
 */

import { useState } from "react";
import { Users, Search, ShieldCheck, UserMinus, Loader2, X, UserSearch } from "lucide-react";
import { CdcrMember } from "../../core/types/models";
import {
  useCdcrMembersQuery,
  useAssignCdcrMemberMutation,
  useRemoveCdcrMemberMutation,
} from "../../hooks/queries/usePlacementQueries";
import { api } from "../../lib/api";
import { useToast } from "../../core/contexts/ToastContext";
import { InlineLoader, ErrorState, EmptyState } from "../ui";

interface TpoCdcrTabProps {
  collegeId: string;
}

interface StudentSearchResult {
  id: string;
  username: string;
  email: string;
  profile?: { fullName: string; avatarUrl?: string | null } | null;
}

export function TpoCdcrTab({ collegeId }: TpoCdcrTabProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");

  // Student search for adding new CDCR members
  const [addQuery, setAddQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // React Query hooks — backed by existing /colleges/:id/tpo/cdcr endpoints
  const { data: members, isLoading, isError, refetch } = useCdcrMembersQuery(collegeId);
  const assignMutation = useAssignCdcrMemberMutation(collegeId);
  const removeMutation = useRemoveCdcrMemberMutation(collegeId);

  // Search for students to add
  const handleStudentSearch = async () => {
    if (!addQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const resp = await api.searchCollegeStudents(collegeId, addQuery.trim());
      setSearchResults((resp.data as StudentSearchResult[]) ?? []);
    } catch {
      showToast("error", "Student search failed. Try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleAssign = (user: StudentSearchResult) => {
    // Check if already a CDCR member
    const already = members?.some((m) => m.userId === user.id);
    if (already) {
      showToast("error", `${user.profile?.fullName ?? user.username} is already a CDCR member.`);
      return;
    }
    assignMutation.mutate(user.id, {
      onSuccess: () => {
        setAddQuery("");
        setSearchResults([]);
      },
    });
  };

  const handleRemove = (member: CdcrMember) => {
    const displayName = member.user?.profile?.fullName ?? member.user?.username ?? "this member";
    if (!confirm(`Remove ${displayName} from CDCR?`)) return;
    setRemovingId(member.userId);
    removeMutation.mutate(member.userId, {
      onSettled: () => setRemovingId(null),
    });
  };

  const filtered = (members ?? []).filter((m) => {
    const name = m.user?.profile?.fullName ?? m.user?.username ?? "";
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      (m.user?.username ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  if (isLoading) return <InlineLoader label="Loading CDCR members..." />;
  if (isError) return <ErrorState title="Error loading CDCR members" onRetry={refetch} />;

  return (
    <div className="space-y-6">

      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              CDCR Student Coordinators
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Career Development Cell Representatives help coordinate placement drives and communicate with students.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
            <Users size={12} /> {members?.length ?? 0} Members
          </span>
        </div>

        {/* Student search to add CDCR member */}
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Search college students by name or username to assign as CDCR:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStudentSearch()}
              placeholder="e.g. Rahul Sharma"
              className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleStudentSearch}
              disabled={searching || !addQuery.trim()}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-60"
            >
              {searching ? <Loader2 size={12} className="animate-spin" /> : <UserSearch size={12} />}
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
              {searchResults.map((user) => {
                const isAlready = members?.some((m) => m.userId === user.id);
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {user.profile?.fullName?.charAt(0) ?? user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {user.profile?.fullName ?? user.username}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">@{user.username}</p>
                    </div>
                    {isAlready ? (
                      <span className="text-xs text-gray-400 italic">Already CDCR</span>
                    ) : (
                      <button
                        onClick={() => handleAssign(user)}
                        disabled={assignMutation.isPending}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-60"
                      >
                        Assign
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* No results */}
          {!searching && addQuery && searchResults.length === 0 && (
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
              No students found for "{addQuery}"
            </p>
          )}

          {/* Clear */}
          {searchResults.length > 0 && (
            <button
              onClick={() => { setSearchResults([]); setAddQuery(""); }}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <X size={11} /> Clear results
            </button>
          )}
        </div>
      </div>

      {/* Member list search */}
      {(members?.length ?? 0) > 4 && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter members..."
            className="w-full text-sm pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Member list */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No CDCR Members Yet"
          text="Search for students above to assign them as CDCR coordinators."
          icon={Users}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((member) => {
            const displayName = member.user?.profile?.fullName ?? member.user?.username ?? "Unknown";
            const avatar = member.user?.profile?.avatarUrl;
            const isRemoving = removingId === member.userId;

            return (
              <div
                key={member.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition"
              >
                <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {avatar
                    ? <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
                    : displayName.charAt(0).toUpperCase()
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    @{member.user?.username}
                    {member.user?.email && (
                      <span className="ml-2 text-gray-300 dark:text-gray-600">· {member.user.email}</span>
                    )}
                  </p>
                </div>

                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  <ShieldCheck size={10} /> CDCR
                </span>

                <button
                  onClick={() => handleRemove(member)}
                  disabled={isRemoving || removeMutation.isPending}
                  className="ml-2 p-2 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                  title="Remove CDCR member"
                >
                  {isRemoving ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
