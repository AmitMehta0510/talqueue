import { FormEvent, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard, Users, GraduationCap, Search, Plus, Trash2,
  ShieldCheck, ShieldAlert, CheckCircle2, Loader2, Lock, Globe,
  Briefcase, X, ExternalLink, Activity, Hash, Zap, BookOpen,
  Building2, FileText, Trophy, AlertTriangle, BarChart3, Settings,
  Eye, Ban, RefreshCw, ChevronDown, ChevronRight, UserCheck,
  Star, TrendingUp, MessageSquare, GitBranch, Award, Mail,
  CheckCircle, XCircle, Archive, BadgeCheck, Shield, Layers,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { Avatar, ErrorState, InlineLoader } from "../components/ui";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import {
  useAdminStatsQuery,
  useAdminUsersQuery,
  useUpdateUserStatusMutation,
  useAssignPlatformAdminMutation,
  useRemovePlatformAdminMutation,
  useAssignCollegeAdminMutation,
  useRemoveCollegeAdminMutation,
  useListCollegeAdminsQuery,
  useAssignCompanyAdminMutation,
  useRemoveCompanyAdminMutation,
  useListCompanyAdminsQuery,
  useCreateCollegeMutation,
  useCreateCompanyMutation,
  useCollegesQuery,
  useCompaniesQuery,
  useAdminPostsQuery,
  useAdminDeletePostMutation,
  useAdminHackathonsQuery,
  useAdminUpdateHackathonStatusMutation,
  useAdminProjectsQuery,
  useAdminUpdateProjectStatusMutation,
  useAdminJobsQuery,
  useAdminDeleteJobMutation,
  useAdminCommunitiesQuery,
  useAdminUpdateCommunityMutation,
  useAdminReferralsQuery,
  useAdminCreateDepartmentMutation,
  useAdminDepartmentsQuery,
  useAdminUpdateHackathonMutation,
  useAdminTriggerScraperMutation,
} from "../hooks/usePlatformQueries";
import { titleCase, userName, getHighestPrivilegeRole } from "../lib/format";
import { College, Company, User } from "../lib/api";

type Tab = "overview" | "users" | "moderation" | "hackathons" | "colleges" | "companies" | "communities" | "referrals" | "company_requests";

const NAV_ITEMS: { id: Tab; label: string; icon: any; badge?: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "moderation", label: "Moderation", icon: Shield },
  { id: "hackathons", label: "Hackathons", icon: Trophy },
  { id: "colleges", label: "Colleges", icon: GraduationCap },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "communities", label: "Communities", icon: Hash },
  { id: "referrals", label: "Referrals", icon: GitBranch },
  { id: "company_requests", label: "Co. Requests", icon: Briefcase },
];

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const fmtRelative = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return fmtDate(d);
};

// ─── STATUS BADGE ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
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
function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
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
function KpiCard({ label, value, icon: Icon, gradient, sub }: {
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
function DistBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
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
function DataTable({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty?: boolean }) {
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
function LoadMoreBtn({ query }: { query: any }) {
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

// ─── MAIN ADMIN PAGE ───────────────────────────────────────────────────────────

export function AdminPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Compute role flags from the authenticated user
  const isSuperAdmin = !!(currentUser?.roles?.some((ur: any) => ur.role?.name === "SUPER_ADMIN"));
  const isPlatformAdminOrHigher = !!(currentUser?.roles?.some(
    (ur: any) => ur.role?.name === "PLATFORM_ADMIN" || ur.role?.name === "SUPER_ADMIN"
  ));
  void isPlatformAdminOrHigher; // may be used for future conditional sections

  const updateUserStatus = useUpdateUserStatusMutation();
  const assignPlatformAdmin = useAssignPlatformAdminMutation();
  const removePlatformAdmin = useRemovePlatformAdminMutation();
  const removeCollegeAdmin = useRemoveCollegeAdminMutation();
  const removeCompanyAdmin = useRemoveCompanyAdminMutation();

  const statsQuery = useAdminStatsQuery();

  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const [confirmAction, setConfirmAction] = useState<{
    type: "ban" | "activate" | "grant_admin" | "revoke_admin" | "revoke_college_admin" | "revoke_company_admin";
    userId: string;
    label: string;
    extraId?: string;
    extraCity?: string;
  } | null>(null);

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === "ban") {
        await updateUserStatus.mutateAsync({ userId: confirmAction.userId, status: "BANNED" });
      } else if (confirmAction.type === "activate") {
        await updateUserStatus.mutateAsync({ userId: confirmAction.userId, status: "ACTIVE" });
      } else if (confirmAction.type === "grant_admin") {
        await assignPlatformAdmin.mutateAsync(confirmAction.userId);
      } else if (confirmAction.type === "revoke_admin") {
        await removePlatformAdmin.mutateAsync(confirmAction.userId);
      } else if (confirmAction.type === "revoke_college_admin" && confirmAction.extraId) {
        await removeCollegeAdmin.mutateAsync({ collegeId: confirmAction.extraId, userId: confirmAction.userId });
      } else if (confirmAction.type === "revoke_company_admin" && confirmAction.extraId) {
        await removeCompanyAdmin.mutateAsync({ companyId: confirmAction.extraId, userId: confirmAction.userId, officeCity: confirmAction.extraCity });
      }
    } catch { /* hook shows toast */ }
    finally { setConfirmAction(null); }
  };

  const isPending =
    updateUserStatus.isPending || assignPlatformAdmin.isPending ||
    removePlatformAdmin.isPending || removeCollegeAdmin.isPending || removeCompanyAdmin.isPending;

  const stats = statsQuery.data;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-screen-xl px-4 py-6">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                <ShieldCheck size={16} className="text-white" />
              </div>
              Platform Admin Console
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Monitor, moderate, and manage the engineering platform.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => statsQuery.refetch()}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-emerald-600 hover:text-emerald-400 transition"
            >
              <RefreshCw size={12} className={statsQuery.isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400">
              <ShieldCheck size={12} />
              {isSuperAdmin ? "Super Admin" : "Platform Admin"}
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* ── Sidebar Nav ─────────────────────────────────────────── */}
          <div className="hidden md:block w-44 shrink-0">
            <nav className="space-y-1 sticky top-6">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all
                    ${activeTab === id
                      ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 border border-transparent"
                    }`}
                  onClick={() => {
                    setActiveTab(id);
                    setSelectedCollege(null);
                    setSelectedCompany(null);
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Mobile Tabs ─────────────────────────────────────────── */}
          <div className="md:hidden flex overflow-x-auto gap-1 pb-2 mb-4 w-full">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all
                  ${activeTab === id ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30" : "text-zinc-500 hover:text-zinc-200 border border-zinc-800"}`}
                onClick={() => { setActiveTab(id); setSelectedCollege(null); setSelectedCompany(null); }}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* ── Main Content ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {activeTab === "overview" && (
              <OverviewPanel stats={stats} loading={statsQuery.isFetching} error={statsQuery.error} onRetry={statsQuery.refetch} />
            )}
            {activeTab === "users" && (
              <UsersPanel
                onAction={(type, userId, label) => setConfirmAction({ type, userId, label })}
                currentUserId={currentUser?.id}
                isSuperAdmin={isSuperAdmin}
              />
            )}
            {activeTab === "moderation" && <ModerationPanel />}
            {activeTab === "hackathons" && <HackathonsPanel />}
            {activeTab === "colleges" && (
              <CollegesPanel
                selectedCollege={selectedCollege}
                onSelectCollege={setSelectedCollege}
                onRevokeAdmin={(collegeId, userId, label) =>
                  setConfirmAction({ type: "revoke_college_admin", userId, label, extraId: collegeId })
                }
              />
            )}
            {activeTab === "companies" && (
              <CompaniesPanel
                selectedCompany={selectedCompany}
                onSelectCompany={setSelectedCompany}
                onRevokeAdmin={(companyId, userId, label, officeCity) =>
                  setConfirmAction({ type: "revoke_company_admin", userId, label, extraId: companyId, extraCity: officeCity })
                }
              />
            )}
            {activeTab === "communities" && <CommunitiesPanel />}
            {activeTab === "referrals" && <ReferralsPanel />}
            {activeTab === "company_requests" && <CompanyRequestsPanel />}
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction?.type === "ban" ? "Ban User" :
          confirmAction?.type === "activate" ? "Activate User" :
          confirmAction?.type === "grant_admin" ? "Grant Admin Rights" :
          confirmAction?.type === "revoke_admin" ? "Revoke Admin Rights" : "Revoke Admin Scope"
        }
        message={
          confirmAction?.type === "ban" ? (
            <p>Are you sure you want to ban <strong>{confirmAction.label}</strong>? They will be locked out of the platform.</p>
          ) : confirmAction?.type === "activate" ? (
            <p>Are you sure you want to reactivate <strong>{confirmAction.label}</strong>?</p>
          ) : confirmAction?.type === "grant_admin" ? (
            <p>Grant <strong>PLATFORM_ADMIN</strong> to <strong>{confirmAction.label}</strong>? This gives full console access.</p>
          ) : confirmAction?.type === "revoke_admin" ? (
            <p>Revoke <strong>PLATFORM_ADMIN</strong> from <strong>{confirmAction.label}</strong>?</p>
          ) : (
            <p>Revoke admin from <strong>{confirmAction?.label}</strong> for this scope?</p>
          )
        }
        confirmLabel={
          confirmAction?.type === "ban" ? "Ban User" :
          confirmAction?.type === "activate" ? "Activate" :
          confirmAction?.type === "grant_admin" ? "Grant Admin" :
          confirmAction?.type === "revoke_admin" ? "Revoke Admin" : "Revoke"
        }
        variant={confirmAction?.type === "ban" || confirmAction?.type?.startsWith("revoke") ? "danger" : "default"}
        isPending={isPending}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

// ─── OVERVIEW PANEL ────────────────────────────────────────────────────────────

function OverviewPanel({ stats, loading, error, onRetry }: { stats: any; loading: boolean; error: unknown; onRetry: () => void }) {
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
        <p className="text-sm text-zinc-500">Loading platform statistics...</p>
      </div>
    </div>
  );
  if (error) return <ErrorState title="Failed to load stats" text="Unable to aggregate database statistics" onRetry={onRetry} />;
  if (!stats) return null;

  const activeUsers = stats.statusDistribution?.find((s: any) => s.status === "ACTIVE")?.count ?? 0;
  const bannedUsers = stats.statusDistribution?.find((s: any) => s.status === "BANNED")?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Quick KPI Grid ── */}
      <div>
        <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-zinc-500">Platform Overview</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          <KpiCard label="Total Users" value={stats.userCount} icon={Users} gradient="from-emerald-500 to-teal-600" sub={`+${stats.newUsersToday} today`} />
          <KpiCard label="Active Users" value={activeUsers} icon={UserCheck} gradient="from-blue-500 to-indigo-600" sub={`${stats.newUsersThisWeek} this week`} />
          <KpiCard label="Posts" value={stats.postCount} icon={FileText} gradient="from-violet-500 to-purple-600" />
          <KpiCard label="Projects" value={stats.projectCount} icon={GitBranch} gradient="from-amber-500 to-orange-600" sub={`${stats.openProjectCount} open`} />
          <KpiCard label="Hackathons" value={stats.hackathonCount} icon={Trophy} gradient="from-pink-500 to-rose-600" />
          <KpiCard label="Jobs" value={stats.jobCount} icon={Briefcase} gradient="from-cyan-500 to-blue-600" sub={`${stats.activeJobCount} active`} />
          <KpiCard label="Communities" value={stats.communityCount} icon={Hash} gradient="from-emerald-600 to-green-700" />
          <KpiCard label="Referrals" value={stats.referralCount} icon={Award} gradient="from-yellow-500 to-amber-600" />
        </div>
      </div>

      {/* ── Institutions Row ── */}
      <div>
        <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-zinc-500">Institutions & Engagement</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <KpiCard label="Colleges" value={stats.collegeCount} icon={GraduationCap} gradient="from-indigo-500 to-blue-600" />
          <KpiCard label="Companies" value={stats.companyCount} icon={Building2} gradient="from-purple-500 to-violet-600" />
          <KpiCard label="Connections" value={stats.connectionCount} icon={Users} gradient="from-teal-500 to-emerald-600" />
          <KpiCard label="Messages" value={stats.messageCount} icon={MessageSquare} gradient="from-rose-500 to-pink-600" />
        </div>
      </div>

      {/* ── Distribution Cards ── */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Status Distribution */}
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-600/20">
              <Activity size={13} className="text-emerald-400" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">Account Status</h3>
          </div>
          <div className="space-y-3">
            {stats.statusDistribution?.map((item: any) => (
              <DistBar
                key={item.status}
                label={item.status}
                count={item.count}
                total={stats.userCount}
                color={item.status === "ACTIVE" ? "bg-emerald-500" : item.status === "BANNED" ? "bg-rose-500" : "bg-zinc-500"}
              />
            ))}
          </div>
        </div>

        {/* Trust Level */}
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-600/20">
              <Star size={13} className="text-amber-400" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">Trust Levels</h3>
          </div>
          <div className="space-y-3">
            {stats.trustLevelDistribution?.map((item: any) => (
              <DistBar key={item.trustLevel} label={item.trustLevel} count={item.count} total={stats.userCount} color="bg-amber-500" />
            ))}
          </div>
        </div>

        {/* Platform Roles */}
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-600/20">
              <ShieldCheck size={13} className="text-violet-400" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">Platform Roles</h3>
          </div>
          <div className="space-y-3">
            {stats.platformRoleDistribution?.length > 0 ? (
              stats.platformRoleDistribution.map((item: any) => (
                <DistBar key={item.roleName} label={item.roleName} count={item.count} total={stats.userCount} color="bg-violet-500" />
              ))
            ) : (
              <p className="text-xs text-zinc-600 italic">No special roles assigned</p>
            )}
          </div>
        </div>
      </div>

      {/* ── User Role Distribution ── */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-600/20">
            <Layers size={13} className="text-blue-400" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">User Role Distribution</h3>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {stats.userRoleDistribution?.map((item: any) => (
            <div key={item.role} className="rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-4 py-3 text-center">
              <div className="text-xl font-black text-white">{item.count}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{titleCase(item.role)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── USERS PANEL ───────────────────────────────────────────────────────────────

function UsersPanel({ onAction, currentUserId, isSuperAdmin }: {
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

// ─── MODERATION PANEL ──────────────────────────────────────────────────────────

type ModerationTab = "posts" | "projects" | "jobs";

function ModerationPanel() {
  const [sub, setSub] = useState<ModerationTab>("posts");
  const [q, setQ] = useState("");

  const SUB_TABS: { id: ModerationTab; label: string; icon: any }[] = [
    { id: "posts", label: "Posts", icon: FileText },
    { id: "projects", label: "Projects", icon: GitBranch },
    { id: "jobs", label: "Jobs", icon: Briefcase },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">Content Moderation</h2>
      </div>

      <div className="flex gap-1 border-b border-zinc-800/60 pb-3">
        {SUB_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all
              ${sub === id ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30" : "text-zinc-500 hover:text-zinc-200 border border-transparent"}`}
            onClick={() => { setSub(id); setQ(""); }}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <SearchBar
        value={q}
        onChange={setQ}
        placeholder={`Search ${sub}...`}
      />

      {sub === "posts" && <PostsModerationTab q={q} />}
      {sub === "projects" && <ProjectsModerationTab q={q} />}
      {sub === "jobs" && <JobsModerationTab q={q} />}
    </div>
  );
}

function PostsModerationTab({ q }: { q: string }) {
  const query = useAdminPostsQuery(q);
  const deletePost = useAdminDeletePostMutation();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const posts = query.data?.pages.flatMap((p) => p?.posts ?? []) ?? [];

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
      {query.isPending ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div> : (
        <>
          <DataTable headers={["Author", "Content Preview", "Engagement", "Date", "Action"]} empty={posts.length === 0}>
            {posts.map((post: any) => (
              <tr key={post.id} className="hover:bg-zinc-800/40 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar user={post.author} size="sm" />
                    <div>
                      <div className="font-semibold text-white">{post.author?.profile?.fullName || post.author?.username}</div>
                      <div className="text-zinc-500">@{post.author?.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-zinc-300 line-clamp-2 leading-relaxed">{post.content}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 text-zinc-500">
                    <span>❤️ {post._count?.likes ?? 0}</span>
                    <span>💬 {post._count?.comments ?? 0}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{fmtRelative(post.createdAt)}</td>
                <td className="px-4 py-3">
                  {confirmDelete === post.id ? (
                    <div className="flex gap-1">
                      <button
                        className="rounded px-2 py-1 text-[10px] font-bold bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition"
                        onClick={async () => { await deletePost.mutateAsync(post.id); setConfirmDelete(null); }}
                        disabled={deletePost.isPending}
                      >
                        {deletePost.isPending ? <Loader2 size={10} className="animate-spin" /> : "Confirm"}
                      </button>
                      <button className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-200" onClick={() => setConfirmDelete(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 rounded-lg border border-rose-700/40 px-2.5 py-1.5 text-[10px] font-bold text-rose-400 hover:bg-rose-500/10 transition"
                      onClick={() => setConfirmDelete(post.id)}
                    >
                      <Trash2 size={10} /> Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
          <div className="p-3"><LoadMoreBtn query={query} /></div>
        </>
      )}
    </div>
  );
}

function HackathonsPanel() {
  const [q, setQ] = useState("");
  const query = useAdminHackathonsQuery(q);
  const updateStatus = useAdminUpdateHackathonStatusMutation();
  const updateHackathon = useAdminUpdateHackathonMutation();
  const runScraper = useAdminTriggerScraperMutation();
  
  const [editingHackathon, setEditingHackathon] = useState<any | null>(null);

  const hackathons = query.data?.pages.flatMap((p) => p?.hackathons ?? []) ?? [];

  const handleToggleVerified = async (h: any) => {
    try {
      await updateHackathon.mutateAsync({
        hackathonId: h.id,
        payload: { verified: !h.verified },
      });
    } catch { /* toast handles it */ }
  };

  const handleToggleFeatured = async (h: any) => {
    try {
      await updateHackathon.mutateAsync({
        hackathonId: h.id,
        payload: { featured: !h.featured },
      });
    } catch { /* toast handles it */ }
  };

  const handleDelete = async (hackathonId: string) => {
    try {
      await updateStatus.mutateAsync({
        hackathonId,
        status: "DELETED",
      });
    } catch { /* toast handles it */ }
  };

  return (
    <div className="space-y-4">
      {/* Scraper Control & Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-350">Scraper Control Panel</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Run scrapers to pull and update hackathons from public platforms.</p>
        </div>
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50"
          onClick={() => runScraper.mutate()}
          disabled={runScraper.isPending}
        >
          {runScraper.isPending ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Scraping Platforms...
            </>
          ) : (
            <>
              <RefreshCw size={13} />
              Run Manual Scrape
            </>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">Hackathon List</h2>
      </div>

      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="Search hackathons by title or organizer..."
      />

      <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
        {query.isPending ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            <DataTable
              headers={["Title", "Source", "Status", "Verified", "Featured", "Registrations", "Dates", "Actions"]}
              empty={hackathons.length === 0}
            >
              {hackathons.map((h: any) => (
                <tr key={h.id} className="hover:bg-zinc-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white max-w-xs truncate">{h.title}</div>
                    {h.organizerName && <div className="text-[10px] text-zinc-500">{h.organizerName}</div>}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                    {h.isExternal ? (
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Globe size={10} />
                        {h.sourcePlatform || "External"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <ShieldCheck size={10} />
                        Internal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={h.status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleVerified(h)}
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg border transition ${
                        h.verified
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                      title={h.verified ? "Verified" : "Click to Verify"}
                      disabled={updateHackathon.isPending}
                    >
                      <ShieldCheck size={12} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(h)}
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg border transition ${
                        h.featured
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                          : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                      title={h.featured ? "Featured" : "Click to Feature"}
                      disabled={updateHackathon.isPending}
                    >
                      <Star size={12} fill={h.featured ? "currentColor" : "none"} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-300">
                    {h._count?.registrations ?? 0}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-[11px] whitespace-nowrap">
                    {h.startDate ? fmtDate(h.startDate) : "—"}
                    {h.endDate ? ` → ${fmtDate(h.endDate)}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {h.status !== "ACTIVE" && h.status !== "LIVE" && (
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-700/30 hover:bg-emerald-500/20 transition"
                          onClick={() => updateStatus.mutateAsync({ hackathonId: h.id, status: "ACTIVE" })}
                        >
                          Activate
                        </button>
                      )}
                      {h.status !== "CLOSED" && h.status !== "COMPLETED" && (
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 transition"
                          onClick={() => updateStatus.mutateAsync({ hackathonId: h.id, status: "CLOSED" })}
                        >
                          Close
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-[10px] font-bold bg-zinc-800 text-zinc-350 border border-zinc-700 hover:bg-zinc-700 transition"
                        onClick={() => setEditingHackathon(h)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-700/30 hover:bg-rose-500/20 transition"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this hackathon?")) {
                            handleDelete(h.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
            <div className="p-3">
              <LoadMoreBtn query={query} />
            </div>
          </>
        )}
      </div>

      {editingHackathon && (
        <EditHackathonModal
          hackathon={editingHackathon}
          onClose={() => setEditingHackathon(null)}
        />
      )}
    </div>
  );
}

function EditHackathonModal({ hackathon, onClose }: { hackathon: any; onClose: () => void }) {
  const updateHackathon = useAdminUpdateHackathonMutation();
  const { showToast } = useToast();

  const [title, setTitle] = useState(hackathon.title || "");
  const [shortDescription, setShortDescription] = useState(hackathon.shortDescription || "");
  const [description, setDescription] = useState(hackathon.description || "");
  const [externalUrl, setExternalUrl] = useState(hackathon.externalUrl || "");
  const [mode, setMode] = useState<"ONLINE" | "OFFLINE" | "HYBRID">(hackathon.mode || "ONLINE");
  const [location, setLocation] = useState(hackathon.location || "");
  const [minTeamSize, setMinTeamSize] = useState(String(hackathon.minTeamSize || 1));
  const [maxTeamSize, setMaxTeamSize] = useState(String(hackathon.maxTeamSize || 4));
  
  const toDateInputStr = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toISOString().substring(0, 16);
  };

  const [startDate, setStartDate] = useState(toDateInputStr(hackathon.startDate));
  const [endDate, setEndDate] = useState(toDateInputStr(hackathon.endDate));
  const [registrationDeadline, setRegistrationDeadline] = useState(toDateInputStr(hackathon.registrationDeadline));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast("error", "Title and Description are required");
      return;
    }
    try {
      await updateHackathon.mutateAsync({
        hackathonId: hackathon.id,
        payload: {
          title,
          shortDescription,
          description,
          externalUrl: hackathon.isExternal ? externalUrl : null,
          mode,
          location: mode === "ONLINE" ? null : location,
          minTeamSize: Number(minTeamSize) || 1,
          maxTeamSize: Number(maxTeamSize) || 1,
          startDate: startDate ? new Date(startDate).toISOString() : null,
          endDate: endDate ? new Date(endDate).toISOString() : null,
          registrationDeadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : null,
        },
      });
      onClose();
    } catch { /* hook handles toast */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Trophy size={16} className="text-emerald-400" />
            Edit Hackathon Details
          </h3>
          <button type="button" className="text-zinc-400 hover:text-white" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-400">Title *</label>
            <input
              type="text"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Hackathon title"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-400">Short Description</label>
            <input
              type="text"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Short summary tagline"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-400">Description *</label>
            <textarea
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition h-28 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full hackathon details"
            />
          </div>

          {hackathon.isExternal && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400">External Organizer URL</label>
              <input
                type="url"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400">Mode</label>
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition"
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
              >
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400">Location</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition disabled:opacity-50"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA"
                disabled={mode === "ONLINE"}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400">Min Team Size</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition"
                value={minTeamSize}
                onChange={(e) => setMinTeamSize(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400">Max Team Size</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition"
                value={maxTeamSize}
                onChange={(e) => setMaxTeamSize(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400">Start Date</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none transition"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400">End Date</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none transition"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400">Regn. Deadline</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none transition"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              className="rounded-lg border border-zinc-700 bg-zinc-850 px-4 py-2 text-xs font-semibold text-zinc-350 hover:bg-zinc-800 transition"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-emerald-500 active:scale-95 transition disabled:opacity-50"
              disabled={updateHackathon.isPending}
            >
              {updateHackathon.isPending && <Loader2 size={12} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectsModerationTab({ q }: { q: string }) {
  const query = useAdminProjectsQuery(q);
  const updateStatus = useAdminUpdateProjectStatusMutation();

  const projects = query.data?.pages.flatMap((p) => p?.projects ?? []) ?? [];

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
      {query.isPending ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div> : (
        <>
          <DataTable headers={["Project", "Owner", "Status", "Visibility", "Members", "Actions"]} empty={projects.length === 0}>
            {projects.map((p: any) => (
              <tr key={p.id} className="hover:bg-zinc-800/40 transition">
                <td className="px-4 py-3">
                  <div className="font-semibold text-white">{p.title}</div>
                  {p.techStack?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.techStack.slice(0, 3).map((t: string) => (
                        <span key={t} className="rounded px-1 text-[9px] bg-zinc-800 text-zinc-500">{t}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar user={p.owner} size="sm" />
                    <span className="text-zinc-400">@{p.owner?.username}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-zinc-500">{p.visibility}</td>
                <td className="px-4 py-3 text-center text-zinc-300">{p._count?.members ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {p.status !== "ARCHIVED" && (
                      <button
                        className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 transition"
                        onClick={() => updateStatus.mutateAsync({ projectId: p.id, status: "ARCHIVED" })}
                      >
                        <Archive size={9} /> Archive
                      </button>
                    )}
                    {p.status === "ARCHIVED" && (
                      <button
                        className="rounded px-2 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-700/30 hover:bg-emerald-500/20 transition"
                        onClick={() => updateStatus.mutateAsync({ projectId: p.id, status: "OPEN" })}
                      >Restore</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
          <div className="p-3"><LoadMoreBtn query={query} /></div>
        </>
      )}
    </div>
  );
}

function JobsModerationTab({ q }: { q: string }) {
  const query = useAdminJobsQuery(q);
  const deleteJob = useAdminDeleteJobMutation();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const jobs = query.data?.pages.flatMap((p) => p?.jobs ?? []) ?? [];

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
      {query.isPending ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div> : (
        <>
          <DataTable headers={["Job", "Company", "Type", "Status", "Applications", "Action"]} empty={jobs.length === 0}>
            {jobs.map((j: any) => (
              <tr key={j.id} className="hover:bg-zinc-800/40 transition">
                <td className="px-4 py-3">
                  <div className="font-semibold text-white">{j.title}</div>
                  <div className="text-zinc-500">{j.location}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {j.company?.logoUrl && (
                      <img src={j.company.logoUrl} alt="" className="h-5 w-5 rounded object-contain" />
                    )}
                    <span className="text-zinc-300">{j.company?.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-500">{j.type} · {j.workMode}</td>
                <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
                <td className="px-4 py-3 text-center text-zinc-300">{j._count?.applications ?? 0}</td>
                <td className="px-4 py-3">
                  {confirmDelete === j.id ? (
                    <div className="flex gap-1">
                      <button
                        className="rounded px-2 py-1 text-[10px] font-bold bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition"
                        onClick={async () => { await deleteJob.mutateAsync(j.id); setConfirmDelete(null); }}
                        disabled={deleteJob.isPending}
                      >
                        {deleteJob.isPending ? <Loader2 size={10} className="animate-spin" /> : "Confirm"}
                      </button>
                      <button className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-200" onClick={() => setConfirmDelete(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 rounded-lg border border-rose-700/40 px-2.5 py-1.5 text-[10px] font-bold text-rose-400 hover:bg-rose-500/10 transition"
                      onClick={() => setConfirmDelete(j.id)}
                    >
                      <Trash2 size={10} /> Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
          <div className="p-3"><LoadMoreBtn query={query} /></div>
        </>
      )}
    </div>
  );
}

// ─── COLLEGES PANEL ────────────────────────────────────────────────────────────

function CollegesPanel({ selectedCollege, onSelectCollege, onRevokeAdmin }: {
  selectedCollege: College | null;
  onSelectCollege: (c: College | null) => void;
  onRevokeAdmin: (collegeId: string, userId: string, label: string) => void;
}) {
  const collegesQuery = useCollegesQuery(100);
  const createCollege = useCreateCollegeMutation();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createCollege.mutateAsync({
        name, city: city || undefined, state: state || undefined,
        website: website || undefined, logoUrl: logoUrl || undefined,
      });
      setName(""); setCity(""); setState(""); setWebsite(""); setLogoUrl("");
      setShowForm(false);
    } catch { }
  };

  const colleges = collegesQuery.data?.pages?.flatMap((p) => p.colleges) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">College Management</h2>
        <button
          className="flex items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition"
          onClick={() => { setShowForm(!showForm); onSelectCollege(null); }}
        >
          <Plus size={12} /> Add College
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-emerald-600/20 bg-zinc-900/60 p-5">
          <h3 className="mb-4 text-sm font-bold text-zinc-300">New College</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-zinc-500">Name *</span>
                <input className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition" value={name} onChange={(e) => setName(e.target.value)} placeholder="IIT Delhi, IIM Ahmedabad..." required />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-zinc-500">City</span>
                <input className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition" value={city} onChange={(e) => setCity(e.target.value)} placeholder="New Delhi" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-zinc-500">State</span>
                <input className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition" value={state} onChange={(e) => setState(e.target.value)} placeholder="Delhi" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-zinc-500">Website</span>
                <input className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." type="url" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-zinc-500">Logo URL</span>
                <input className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." type="url" />
              </label>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50" type="submit" disabled={createCollege.isPending}>
                {createCollege.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Add College
              </button>
              <button type="button" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        {/* College List */}
        <div className="space-y-2">
          {collegesQuery.isPending ? (
            <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
          ) : colleges.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <GraduationCap size={28} className="mb-3 text-zinc-600" />
              <p className="text-sm text-zinc-500">No colleges listed yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {colleges.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectCollege(selectedCollege?.id === c.id ? null : c)}
                  className={`cursor-pointer rounded-xl border p-4 transition hover:shadow-md
                    ${selectedCollege?.id === c.id ? "border-emerald-600/50 bg-emerald-500/5" : "border-zinc-700/50 bg-zinc-800/40 hover:border-zinc-600"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {c.logoUrl ? (
                        <img src={c.logoUrl} alt={c.name} className="h-8 w-8 rounded-lg object-contain bg-zinc-700" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-600/20">
                          <GraduationCap size={14} className="text-indigo-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-sm text-white">{c.name}</div>
                        <div className="text-[11px] text-zinc-500">{[c.city, c.state].filter(Boolean).join(", ") || "No location"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                      <span>{c._count?.departments ?? 0} depts</span>
                      <span>{c._count?.profiles ?? 0} students</span>
                      {c.website && (
                        <a href={c.website} target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink size={10} />
                        </a>
                      )}
                      <ChevronRight size={12} className={`transition-transform ${selectedCollege?.id === c.id ? "rotate-90 text-emerald-400" : ""}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* College Admin Panel */}
        <div>
          {selectedCollege && (
            <CollegeDetailPanel
              college={selectedCollege}
              onClose={() => onSelectCollege(null)}
              onRevoke={(userId, label) => onRevokeAdmin(selectedCollege.id, userId, label)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CollegeDetailPanel({ college, onClose, onRevoke }: {
  college: College;
  onClose: () => void;
  onRevoke: (userId: string, label: string) => void;
}) {
  const adminsQuery = useListCollegeAdminsQuery(college.id);
  const assignAdmin = useAssignCollegeAdminMutation();
  const deptQuery = useAdminDepartmentsQuery(college.id);
  const createDept = useAdminCreateDepartmentMutation();

  const [targetUserId, setTargetUserId] = useState("");
  const [deptName, setDeptName] = useState("");
  const [deptHod, setDeptHod] = useState("");

  const [activeSection, setActiveSection] = useState<"admins" | "departments">("admins");

  const handleAssignAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim()) return;
    try {
      await assignAdmin.mutateAsync({ collegeId: college.id, userId: targetUserId.trim() });
      setTargetUserId("");
    } catch { }
  };

  const handleCreateDept = async (e: FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    try {
      await createDept.mutateAsync({ collegeId: college.id, name: deptName.trim(), hod: deptHod.trim() || undefined });
      setDeptName(""); setDeptHod("");
    } catch { }
  };

  const admins = adminsQuery.data || [];
  const departments = deptQuery.data || [];

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-5 py-4">
        <div>
          <h3 className="font-bold text-sm text-white">{college.name}</h3>
          <p className="text-[11px] text-zinc-500">{[college.city, college.state].filter(Boolean).join(", ")}</p>
        </div>
        <button className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 transition" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      {/* Sub-section Toggle */}
      <div className="flex border-b border-zinc-800/60">
        {(["admins", "departments"] as const).map((s) => (
          <button
            key={s}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all
              ${activeSection === s ? "border-b-2 border-emerald-500 text-emerald-400" : "text-zinc-500 hover:text-zinc-200"}`}
            onClick={() => setActiveSection(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {activeSection === "admins" && (
          <>
            <form onSubmit={handleAssignAdmin} className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="User UUID to assign as admin..."
                required
              />
              <button className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50" type="submit" disabled={assignAdmin.isPending}>
                {assignAdmin.isPending ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add
              </button>
            </form>

            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Assigned Admins ({admins.length})</div>
              {adminsQuery.isPending ? <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-emerald-500" /></div> :
               admins.length === 0 ? <p className="text-xs text-zinc-600 italic">No administrators assigned.</p> : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {admins.map((admin: any) => {
                    const u = admin.user;
                    const label = userName(u);
                    return (
                      <div key={admin.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar user={u} size="sm" />
                          <div>
                            <div className="text-xs font-semibold text-white">{label}</div>
                            <div className="text-[10px] text-zinc-500">@{u.username}</div>
                          </div>
                        </div>
                        <button className="rounded p-1 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition" onClick={() => onRevoke(u.id, label)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeSection === "departments" && (
          <>
            <form onSubmit={handleCreateDept} className="space-y-2">
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="Department name (e.g. Computer Science)"
                required
              />
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition"
                value={deptHod}
                onChange={(e) => setDeptHod(e.target.value)}
                placeholder="Head of Department (optional)"
              />
              <button className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50" type="submit" disabled={createDept.isPending}>
                {createDept.isPending ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Create Department
              </button>
            </form>

            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Departments ({departments.length})</div>
              {deptQuery.isPending ? <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-emerald-500" /></div> :
               departments.length === 0 ? <p className="text-xs text-zinc-600 italic">No departments yet.</p> : (
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {departments.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2.5">
                      <div>
                        <div className="text-xs font-semibold text-white">{d.name}</div>
                        {d.hod && <div className="text-[10px] text-zinc-500">HOD: {d.hod}</div>}
                      </div>
                      <div className="text-[10px] text-zinc-600">{fmtDate(d.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── COMPANIES PANEL ───────────────────────────────────────────────────────────

function CompaniesPanel({ selectedCompany, onSelectCompany, onRevokeAdmin }: {
  selectedCompany: Company | null;
  onSelectCompany: (c: Company | null) => void;
  onRevokeAdmin: (companyId: string, userId: string, label: string, officeCity?: string) => void;
}) {
  const companiesQuery = useCompaniesQuery({});
  const createCompany = useCreateCompanyMutation();

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createCompany.mutateAsync({ name, websiteUrl: website || undefined, logoUrl: logoUrl || undefined, description: description || undefined });
      setName(""); setWebsite(""); setLogoUrl(""); setDescription("");
      setShowForm(false);
    } catch { }
  };

  const companies = companiesQuery.data?.companies || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">Company Management</h2>
        <button
          className="flex items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition"
          onClick={() => { setShowForm(!showForm); onSelectCompany(null); }}
        >
          <Plus size={12} /> Add Company
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-emerald-600/20 bg-zinc-900/60 p-5">
          <h3 className="mb-4 text-sm font-bold text-zinc-300">New Partner Company</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase text-zinc-500">Company Name *</span>
              <input className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition" value={name} onChange={(e) => setName(e.target.value)} placeholder="Google, Microsoft..." required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-zinc-500">Website URL</span>
                <input className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." type="url" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-zinc-500">Logo URL</span>
                <input className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." type="url" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase text-zinc-500">Description</span>
              <textarea className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none transition min-h-16 resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief company description..." />
            </label>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50" type="submit" disabled={createCompany.isPending}>
                {createCompany.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Add Company
              </button>
              <button type="button" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-2">
          {companiesQuery.isPending ? (
            <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <Building2 size={28} className="mb-3 text-zinc-600" />
              <p className="text-sm text-zinc-500">No companies listed yet.</p>
            </div>
          ) : companies.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCompany(selectedCompany?.id === c.id ? null : c)}
              className={`cursor-pointer rounded-xl border p-4 transition hover:shadow-md
                ${selectedCompany?.id === c.id ? "border-emerald-600/50 bg-emerald-500/5" : "border-zinc-700/50 bg-zinc-800/40 hover:border-zinc-600"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt={c.name} className="h-8 w-8 rounded-lg object-contain bg-zinc-700" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-600/20 border border-purple-600/20">
                      <Building2 size={14} className="text-purple-400" />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm text-white">{c.name}</div>
                    {c.description && <div className="text-[11px] text-zinc-500 truncate max-w-xs">{c.description}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.websiteUrl && (
                    <a href={c.websiteUrl} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-emerald-400 transition" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <ChevronRight size={12} className={`text-zinc-600 transition-transform ${selectedCompany?.id === c.id ? "rotate-90 text-emerald-400" : ""}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          {selectedCompany && (
            <CompanyAdminPanel
              company={selectedCompany}
              onClose={() => onSelectCompany(null)}
              onRevoke={(userId, label, officeCity) => onRevokeAdmin(selectedCompany.id, userId, label, officeCity)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CompanyAdminPanel({ company, onClose, onRevoke }: {
  company: Company;
  onClose: () => void;
  onRevoke: (userId: string, label: string, officeCity?: string) => void;
}) {
  const adminsQuery = useListCompanyAdminsQuery(company.id);
  const assignAdmin = useAssignCompanyAdminMutation();
  const [targetUserId, setTargetUserId] = useState("");
  const [officeCity, setOfficeCity] = useState("");

  const handleAssign = async (e: FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim()) return;
    try {
      await assignAdmin.mutateAsync({ companyId: company.id, userId: targetUserId.trim(), officeCity: officeCity.trim() || undefined });
      setTargetUserId(""); setOfficeCity("");
    } catch { }
  };

  const admins = adminsQuery.data || [];

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-5 py-4">
        <div>
          <h3 className="font-bold text-sm text-white">{company.name}</h3>
          <p className="text-[11px] text-zinc-500">Manage company administrators</p>
        </div>
        <button className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 transition" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <form onSubmit={handleAssign} className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-800/40 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Assign New Admin</div>
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="User UUID..." required />
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition" value={officeCity} onChange={(e) => setOfficeCity(e.target.value)} placeholder="Office city scope (optional — leave blank for global)" />
          <button className="w-full flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50" type="submit" disabled={assignAdmin.isPending}>
            {assignAdmin.isPending ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Assign Admin
          </button>
        </form>

        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Assigned Admins ({admins.length})</div>
          {adminsQuery.isPending ? <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-emerald-500" /></div> :
           admins.length === 0 ? <p className="text-xs text-zinc-600 italic">No administrators assigned.</p> : (
            <div className="max-h-52 overflow-y-auto space-y-1">
              {admins.map((admin: any) => {
                const u = admin.user;
                const label = userName(u);
                return (
                  <div key={admin.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar user={u} size="sm" />
                      <div>
                        <div className="text-xs font-semibold text-white">{label}</div>
                        <div className="text-[10px] text-zinc-500">{admin.officeCity ? `📍 ${admin.officeCity}` : "Global Admin"}</div>
                      </div>
                    </div>
                    <button className="rounded p-1 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition" onClick={() => onRevoke(u.id, label, admin.officeCity)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── COMMUNITIES PANEL ─────────────────────────────────────────────────────────

function CommunitiesPanel() {
  const [q, setQ] = useState("");
  const query = useAdminCommunitiesQuery(q);
  const updateCommunity = useAdminUpdateCommunityMutation();

  const communities = query.data?.pages.flatMap((p) => p?.communities ?? []) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">Community Management</h2>
        <span className="text-xs text-zinc-600">{communities.length} loaded</span>
      </div>
      <SearchBar value={q} onChange={setQ} placeholder="Search communities..." />

      <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
        {query.isPending ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
        ) : (
          <>
            <DataTable
              headers={["Community", "Type", "Members", "Verified", "Status", "Actions"]}
              empty={communities.length === 0}
            >
              {communities.map((c: any) => (
                <tr key={c.id} className="hover:bg-zinc-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.name} className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-600/20">
                          <Hash size={12} className="text-emerald-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-white">{c.name}</div>
                        <div className="text-[10px] text-zinc-500">
                          {c.college?.name || c.company?.name || c.category}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{c.type}</td>
                  <td className="px-4 py-3 text-center text-zinc-300">{c.memberCount || c._count?.members || 0}</td>
                  <td className="px-4 py-3">
                    {c.verified ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold"><BadgeCheck size={11} /> Verified</span>
                    ) : (
                      <span className="text-zinc-600 text-[10px]">Unverified</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.archived ? "ARCHIVED" : "ACTIVE"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {!c.verified && (
                        <button
                          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-700/30 hover:bg-emerald-500/20 transition"
                          onClick={() => updateCommunity.mutateAsync({ communityId: c.id, verified: true })}
                        >
                          <BadgeCheck size={9} /> Verify
                        </button>
                      )}
                      {!c.archived ? (
                        <button
                          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 transition"
                          onClick={() => updateCommunity.mutateAsync({ communityId: c.id, archived: true })}
                        >
                          <Archive size={9} /> Archive
                        </button>
                      ) : (
                        <button
                          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-700/30 hover:bg-emerald-500/20 transition"
                          onClick={() => updateCommunity.mutateAsync({ communityId: c.id, archived: false })}
                        >
                          <CheckCircle size={9} /> Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
            <div className="p-3"><LoadMoreBtn query={query} /></div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── REFERRALS PANEL ───────────────────────────────────────────────────────────

function ReferralsPanel() {
  const [q, setQ] = useState("");
  const query = useAdminReferralsQuery(q);

  const referrals = query.data?.pages.flatMap((p) => p?.referrals ?? []) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">Referral Monitoring</h2>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Eye size={12} />
          Read-only monitoring view
        </div>
      </div>
      <SearchBar value={q} onChange={setQ} placeholder="Search by company or role..." />

      <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
        {query.isPending ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
        ) : (
          <>
            <DataTable
              headers={["Requester", "Referrer", "Company", "Role", "Status", "Date"]}
              empty={referrals.length === 0}
            >
              {referrals.map((r: any) => (
                <tr key={r.id} className="hover:bg-zinc-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar user={r.requester} size="sm" />
                      <div>
                        <div className="font-semibold text-white">{r.requester?.profile?.fullName || r.requester?.username}</div>
                        <div className="text-zinc-500">@{r.requester?.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.referrer ? (
                      <div className="flex items-center gap-2">
                        <Avatar user={r.referrer} size="sm" />
                        <span className="text-zinc-300">@{r.referrer?.username}</span>
                      </div>
                    ) : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">{r.companyName}</td>
                  <td className="px-4 py-3 text-zinc-400">{r.jobRole || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{fmtRelative(r.createdAt)}</td>
                </tr>
              ))}
            </DataTable>
            <div className="p-3"><LoadMoreBtn query={query} /></div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── COMPANY REQUESTS PANEL ─────────────────────────────────────────────────────

function CompanyRequestsPanel() {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { api } = await import("../lib/api");
      const res = await api.adminCompanyRequests(statusFilter);
      setRequests((res.data as any[]) || []);
    } catch {
      showToast("error", "Failed to load company requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  // Load on mount and filter change
  useState(() => { loadRequests(); });

  const handleApprove = async (requestId: string) => {
    setActionPending(requestId);
    try {
      const { api } = await import("../lib/api");
      await api.adminApproveCompanyRequest(requestId);
      showToast("success", "Company approved and job posted!");
      loadRequests();
    } catch {
      showToast("error", "Failed to approve");
    } finally {
      setActionPending(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const notes = window.prompt("Rejection reason (optional):");
    if (notes === null) return;
    setActionPending(requestId);
    try {
      const { api } = await import("../lib/api");
      await api.adminRejectCompanyRequest(requestId, notes || undefined);
      showToast("success", "Company request rejected");
      loadRequests();
    } catch {
      showToast("error", "Failed to reject");
    } finally {
      setActionPending(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">Company Registration Requests</h2>
        <div className="flex items-center gap-2">
          {["PENDING", "APPROVED", "REJECTED"].map((s) => (
            <button
              key={s}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === s
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30"
                  : "text-zinc-500 border border-zinc-700 hover:text-zinc-200"
              }`}
              onClick={() => { setStatusFilter(s); }}
            >
              {s}
            </button>
          ))}
          <button
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition"
            onClick={loadRequests}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-zinc-800 p-4"><CheckCircle2 size={20} className="text-zinc-500" /></div>
            <p className="text-sm text-zinc-500">No {statusFilter.toLowerCase()} company requests</p>
          </div>
        ) : (
          <DataTable
            headers={["Company Name", "Requested By", "Job Title", "Status", "Date", statusFilter === "PENDING" ? "Actions" : "Result"]}
          >
            {requests.map((r: any) => {
              const jobData = r.pendingJobData || {};
              return (
                <tr key={r.id} className="hover:bg-zinc-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{r.companyName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar user={r.requestedBy} size="sm" />
                      <div>
                        <div className="font-semibold text-white text-xs">{r.requestedBy?.profile?.fullName || r.requestedBy?.username}</div>
                        <div className="text-zinc-500 text-[10px]">@{r.requestedBy?.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300 text-xs">{jobData.title || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">{fmtRelative(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    {r.status === "PENDING" ? (
                      <div className="flex items-center gap-2">
                        <button
                          className="flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-600/30 px-2.5 py-1.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-600/30 transition disabled:opacity-50"
                          onClick={() => handleApprove(r.id)}
                          disabled={actionPending === r.id}
                        >
                          {actionPending === r.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                          Approve
                        </button>
                        <button
                          className="flex items-center gap-1 rounded-lg bg-rose-600/20 border border-rose-600/30 px-2.5 py-1.5 text-[10px] font-bold text-rose-400 hover:bg-rose-600/30 transition disabled:opacity-50"
                          onClick={() => handleReject(r.id)}
                          disabled={actionPending === r.id}
                        >
                          {actionPending === r.id ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />}
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-500">{r.reviewNotes || (r.status === "APPROVED" ? "Company created & job posted" : "—")}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>
    </div>
  );
}
