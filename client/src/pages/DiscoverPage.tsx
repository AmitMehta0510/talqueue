/**
 * DiscoverPage.tsx
 *
 * Talent & Team Directory Dashboard — rebuilt as a pure people-search interface.
 * Jobs, hackathons, companies, posts, and communities tabs have been removed.
 * Routing for those entities now lives on their dedicated pages (/jobs, /hackathons, etc.)
 * and on the unified /search results page.
 *
 * Supported filters (all wired to the existing /api/v1/search/users endpoint):
 *   college, branch/department, graduation year, primary role,
 *   skills, openToWork, acceptingReferrals, verifiedSkillsOnly
 */

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Filter,
  Loader2,
  Search,
  SlidersHorizontal,
  UserRound,
  Users,
  X,
  MessageSquare,
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import { EngineerCard } from "../components/cards/SocialCards";
import { Avatar, EmptyState, InlineLoader } from "../components/ui";
import { useAuth } from "../core/contexts/AuthContext";
import { useToast } from "../core/contexts/ToastContext";
import {
  useConnectUserMutation,
  useCreateDirectConversationMutation,
  useFollowUserMutation,
  usePlatformSearchMutation,
  useSuggestedEngineersQuery,
  useSuggestedCollaboratorsQuery,
  useSuggestedTeammatesQuery,
  useUpgradePremiumMutation,
} from "../hooks/usePlatformQueries";
import { User } from "../lib/api";
import { userName, userHeadline } from "../core/utils/format";

// ─── Filter state ─────────────────────────────────────────────────────────────

interface TalentFilters {
  college: string;
  department: string;
  gradYear: string;
  role: string;
  skills: string;
  openToWork: boolean;
  acceptingReferrals: boolean;
  verifiedSkillsOnly: boolean;
}

const emptyFilters: TalentFilters = {
  college: "",
  department: "",
  gradYear: "",
  role: "",
  skills: "",
  openToWork: false,
  acceptingReferrals: false,
  verifiedSkillsOnly: false,
};

const GRAD_YEARS = Array.from({ length: 10 }, (_, i) =>
  String(new Date().getFullYear() - 2 + i)
);

const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "STUDENT", label: "Student" },
  { value: "PROFESSIONAL", label: "Professional" },
  { value: "WORKING_PROFESSIONAL", label: "Working Professional" },
  { value: "RECRUITER", label: "Recruiter" },
];

// ─── Filter toggle chip ───────────────────────────────────────────────────────

function ToggleChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
        checked
          ? "bg-indigo-600 text-white border-indigo-600 shadow-glow-sm"
          : "border-[color:var(--border)] hover:border-[color:var(--border-strong)]"
      }`}
      style={checked ? {} : { color: "var(--text-secondary)", background: "var(--bg-surface-2)" }}
    >
      {checked && <ShieldCheck size={11} />}
      {label}
    </button>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonUserCard() {
  return (
    <div
      className="panel p-5 animate-pulse"
      style={{ background: "var(--bg-surface)" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="h-10 w-10 rounded-full"
          style={{ background: "var(--bg-surface-2)" }}
        />
        <div className="flex-1 space-y-1.5">
          <div
            className="h-3.5 w-2/3 rounded"
            style={{ background: "var(--bg-surface-2)" }}
          />
          <div
            className="h-2.5 w-1/2 rounded"
            style={{ background: "var(--bg-surface-2)" }}
          />
        </div>
      </div>
      <div className="space-y-2">
        <div
          className="h-2.5 w-full rounded"
          style={{ background: "var(--bg-surface-2)" }}
        />
        <div
          className="h-2.5 w-4/5 rounded"
          style={{ background: "var(--bg-surface-2)" }}
        />
      </div>
      <div className="mt-4 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-5 w-16 rounded"
            style={{ background: "var(--bg-surface-2)" }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  // Read ?q= from URL (set by header search or SearchResultsPage "View All People" link)
  const initialQuery = useMemo(() => {
    return new URLSearchParams(location.search).get("q") ?? "";
  }, [location.search]);

  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<TalentFilters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Premium upgrade modal (retained for verifiedSkillsOnly recruiter gate)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const upgradeMutation = useUpgradePremiumMutation();
  const isRecruiter = user?.roles?.some((ur: any) => ur.role?.name === "RECRUITER");
  const isPremiumRecruiter = user?.roles?.some((ur: any) => ur.role?.name === "PREMIUM_RECRUITER");

  // Mutations
  const search = usePlatformSearchMutation();
  const followUser = useFollowUserMutation();
  const connectUser = useConnectUserMutation();
  const createDM = useCreateDirectConversationMutation();

  // Suggestions (shown when no active search)
  const suggestedEngineers = useSuggestedEngineersQuery(12);
  const collaborators = useSuggestedCollaboratorsQuery(6);
  const teammates = useSuggestedTeammatesQuery(6);

  // Auto-search when URL has an initial query
  useEffect(() => {
    if (initialQuery) {
      doSearch(initialQuery, emptyFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = useCallback(
    (q: string, f: TalentFilters) => {
      setHasSearched(true);
      search.mutate({
        tab: "people",
        q,
        people: {
          college: f.college,
          year: f.gradYear,
          skills: f.skills,
          role: f.role,
          openToWork: f.openToWork,
          acceptingReferrals: f.acceptingReferrals,
          verifiedSkillsOnly: f.verifiedSkillsOnly,
        },
      } as any);
    },
    [search]
  );

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    doSearch(query, filters);
  };

  const handleReset = () => {
    setQuery("");
    setFilters(emptyFilters);
    setHasSearched(false);
    search.reset();
  };

  const handleOpenMessage = async (targetUser: User) => {
    const result = await createDM.mutateAsync(targetUser.id);
    navigate(`/chat/${result.data.id}`);
  };

  const handleVerifiedSkillsOnly = (val: boolean) => {
    if (val && isRecruiter && !isPremiumRecruiter) {
      setShowUpgradeModal(true);
    } else {
      setFilters((f) => ({ ...f, verifiedSkillsOnly: val }));
    }
  };

  const searchedUsers: User[] = useMemo(() => {
    const raw = search.data?.users;
    if (!raw) return [];
    // Unwrap ranked objects if necessary
    return (raw as any[]).map((r: any) => (r.user ? r.user : r));
  }, [search.data]);

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== "" && v !== false
  );

  const isSearching = search.isPending;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Premium upgrade modal ─────────────────────────────────────────── */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl border-base bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4 border-base bg-surface-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-amber-600" />
                <h3 className="font-bold text-primary">
                  Upgrade to Recruiter Premium
                </h3>
              </div>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="rounded-lg p-1 text-muted-fg hover:bg-surface-3 hover:text-primary transition"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 text-center space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <ShieldCheck size={24} />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-primary">
                  Unlock Verified Candidate Search
                </h4>
                <p className="text-xs max-w-xs mx-auto leading-relaxed text-muted-fg">
                  Filter results to only show candidates with verified skills
                  and code repositories. Upgrade to access this feature.
                </p>
              </div>
              <button
                onClick={() => {
                  upgradeMutation.mutate(undefined, {
                    onSuccess: () => {
                      setFilters((f) => ({ ...f, verifiedSkillsOnly: true }));
                      setShowUpgradeModal(false);
                    },
                  });
                }}
                disabled={upgradeMutation.isPending}
                className="btn-primary w-full bg-amber-600 hover:bg-amber-700 ring-amber-100 flex items-center justify-center gap-2"
              >
                {upgradeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Upgrade to Premium"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">

        {/* ── Page header ────────────────────────────────────────────────── */}
        <div className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-700 text-white shadow-glow-sm">
                  <Users size={18} />
                </div>
                <div>
                  <h1
                    className="text-xl font-black tracking-tight leading-none"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Talent Directory
                  </h1>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Find engineers, collaborators &amp; teammates
                  </p>
                </div>
              </div>
            </div>

            {/* Filter toggle button */}
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border transition-all duration-150 ${
                filtersOpen || hasActiveFilters
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-glow-sm"
                  : "border-[color:var(--border)] hover:border-[color:var(--border-strong)]"
              }`}
              style={
                filtersOpen || hasActiveFilters
                  ? {}
                  : {
                      color: "var(--text-secondary)",
                      background: "var(--bg-surface-2)",
                    }
              }
            >
              <SlidersHorizontal size={14} />
              Filters
              {hasActiveFilters && (
                <span className="bg-white/30 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black">
                  {
                    Object.values(filters).filter(
                      (v) => v !== "" && v !== false
                    ).length
                  }
                </span>
              )}
            </button>
          </div>

          {/* ── Search bar ───────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="mt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                  size={15}
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  id="discover-search-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="field pl-9 py-2 text-sm w-full"
                  placeholder="Search by name, username, skill…"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-primary transition"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button type="submit" className="btn-primary text-sm px-5">
                {isSearching ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Search size={15} />
                )}
                <span className="hidden sm:inline ml-1.5">Search</span>
              </button>
              {hasSearched && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-secondary text-xs px-3"
                >
                  <X size={13} />
                  Reset
                </button>
              )}
            </div>
          </form>

          {/* ── Filter panel ─────────────────────────────────────────────── */}
          {filtersOpen && (
            <div
              className="mt-4 border-t pt-4 animate-fade-up"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                {/* College */}
                <label className="block">
                  <span className="field-label">College</span>
                  <input
                    id="filter-college"
                    className="field text-sm"
                    placeholder="e.g. IIT Bombay"
                    value={filters.college}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, college: e.target.value }))
                    }
                  />
                </label>

                {/* Branch / Department */}
                <label className="block">
                  <span className="field-label">Branch / Department</span>
                  <input
                    id="filter-department"
                    className="field text-sm"
                    placeholder="e.g. Computer Science"
                    value={filters.department}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, department: e.target.value }))
                    }
                  />
                </label>

                {/* Graduation Year */}
                <label className="block">
                  <span className="field-label">Graduation Year</span>
                  <select
                    id="filter-grad-year"
                    className="field text-sm"
                    value={filters.gradYear}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, gradYear: e.target.value }))
                    }
                  >
                    <option value="">Any year</option>
                    {GRAD_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Primary Role */}
                <label className="block">
                  <span className="field-label">Role</span>
                  <select
                    id="filter-role"
                    className="field text-sm"
                    value={filters.role}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, role: e.target.value }))
                    }
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Skills */}
                <label className="block sm:col-span-2">
                  <span className="field-label">Skills (comma-separated)</span>
                  <input
                    id="filter-skills"
                    className="field text-sm"
                    placeholder="e.g. React, Python, Machine Learning"
                    value={filters.skills}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, skills: e.target.value }))
                    }
                  />
                </label>

                {/* Toggle chips */}
                <div className="sm:col-span-2 flex flex-wrap items-end gap-2 pb-1">
                  <ToggleChip
                    label="Open to Work"
                    checked={filters.openToWork}
                    onChange={(v) =>
                      setFilters((f) => ({ ...f, openToWork: v }))
                    }
                  />
                  <ToggleChip
                    label="Accepting Referrals"
                    checked={filters.acceptingReferrals}
                    onChange={(v) =>
                      setFilters((f) => ({ ...f, acceptingReferrals: v }))
                    }
                  />
                  <ToggleChip
                    label="Verified Skills Only"
                    checked={filters.verifiedSkillsOnly}
                    onChange={handleVerifiedSkillsOnly}
                  />
                </div>
              </div>

              {/* Apply & Clear row */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="btn-primary text-sm"
                >
                  <Filter size={14} />
                  Apply Filters
                </button>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilters(emptyFilters);
                    }}
                    className="btn-secondary text-xs"
                  >
                    <X size={12} />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Search results ─────────────────────────────────────────────── */}
        {hasSearched && (
          <section aria-label="Talent search results">
            {isSearching && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonUserCard key={i} />
                ))}
              </div>
            )}

            {!isSearching && search.isError && (
              <div
                className="panel p-6 text-center"
                style={{ color: "var(--text-muted)" }}
              >
                <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  Search failed
                </p>
                <p className="text-sm">
                  Something went wrong. Please try again.
                </p>
                <button
                  onClick={() => handleSubmit()}
                  className="btn-primary mt-4 text-xs"
                >
                  Retry
                </button>
              </div>
            )}

            {!isSearching && !search.isError && searchedUsers.length === 0 && (
              <EmptyState
                icon={UserRound}
                title="No engineers found"
                text="Try adjusting your search query or filters."
              />
            )}

            {!isSearching && searchedUsers.length > 0 && (
              <>
                <p
                  className="text-xs font-semibold mb-3"
                  style={{ color: "var(--text-muted)" }}
                >
                  {searchedUsers.length} engineer
                  {searchedUsers.length !== 1 ? "s" : ""} found
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {searchedUsers.map((u) => (
                    <EngineerCard
                      key={u.id}
                      user={u}
                      currentUserId={user?.id}
                      onConnect={(u) => connectUser.mutate(u.id)}
                      onFollow={(u) => followUser.mutate(u.id)}
                      onMessage={(u) => handleOpenMessage(u as User)}
                      onOpenProfile={(u) =>
                        navigate(`/users/${(u as User).username || u.id}`)
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* ── Suggested engineers (default view when no search) ────────── */}
        {!hasSearched && (
          <div className="space-y-8">

            {/* Top Engineers */}
            <section aria-label="Suggested engineers">
              <div className="flex items-center gap-2 mb-4">
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                  <UserRound size={14} />
                </div>
                <h2
                  className="text-sm font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Suggested Engineers
                </h2>
              </div>

              {suggestedEngineers.isFetching ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonUserCard key={i} />
                  ))}
                </div>
              ) : (suggestedEngineers.data ?? []).length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No suggestions yet"
                  text="Use the search bar above to find engineers."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(suggestedEngineers.data ?? []).map((u) => (
                    <EngineerCard
                      key={u.id}
                      user={u}
                      currentUserId={user?.id}
                      onConnect={(u) => connectUser.mutate(u.id)}
                      onFollow={(u) => followUser.mutate(u.id)}
                      onMessage={(u) => handleOpenMessage(u as User)}
                      onOpenProfile={(u) =>
                        navigate(`/users/${(u as any).username || u.id}`)
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Open Collaborators */}
            {(collaborators.data ?? []).length > 0 && (
              <section aria-label="Open to collaborate">
                <div className="flex items-center gap-2 mb-4">
                  <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
                    <Users size={14} />
                  </div>
                  <h2
                    className="text-sm font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Open to Collaborate
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(collaborators.data ?? []).map((u) => (
                    <EngineerCard
                      key={u.id}
                      user={u}
                      currentUserId={user?.id}
                      onConnect={(u) => connectUser.mutate(u.id)}
                      onFollow={(u) => followUser.mutate(u.id)}
                      onMessage={(u) => handleOpenMessage(u as User)}
                      onOpenProfile={(u) =>
                        navigate(`/users/${(u as any).username || u.id}`)
                      }
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Suggested Teammates */}
            {(teammates.data ?? []).length > 0 && (
              <section aria-label="Suggested teammates">
                <div className="flex items-center gap-2 mb-4">
                  <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
                    <MessageSquare size={14} />
                  </div>
                  <h2
                    className="text-sm font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Suggested Teammates
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(teammates.data ?? []).map((u) => (
                    <EngineerCard
                      key={u.id}
                      user={u}
                      currentUserId={user?.id}
                      onConnect={(u) => connectUser.mutate(u.id)}
                      onFollow={(u) => followUser.mutate(u.id)}
                      onMessage={(u) => handleOpenMessage(u as User)}
                      onOpenProfile={(u) =>
                        navigate(`/users/${(u as any).username || u.id}`)
                      }
                    />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </>
  );
}
