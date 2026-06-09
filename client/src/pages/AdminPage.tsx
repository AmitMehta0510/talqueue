import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  GraduationCap,
  Search,
  Plus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Check,
  Loader2,
  Lock,
  Globe,
  Briefcase,
  X,
  ExternalLink,
  Activity,
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
} from "../hooks/usePlatformQueries";
import { titleCase, userName } from "../lib/format";
import { College, Company, User } from "../lib/api";

type Tab = "overview" | "users" | "colleges" | "companies";

export function AdminPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Mutations
  const updateUserStatus = useUpdateUserStatusMutation();
  const assignPlatformAdmin = useAssignPlatformAdminMutation();
  const removePlatformAdmin = useRemovePlatformAdminMutation();
  const removeCollegeAdmin = useRemoveCollegeAdminMutation();
  const removeCompanyAdmin = useRemoveCompanyAdminMutation();

  // Queries
  const statsQuery = useAdminStatsQuery();

  // Selected sub-management states
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // General confirm dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: "ban" | "activate" | "grant_admin" | "revoke_admin" | "revoke_college_admin" | "revoke_company_admin";
    userId: string;
    label: string;
    extraId?: string; // e.g. collegeId, companyId
    extraCity?: string; // e.g. officeCity
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
        await removeCollegeAdmin.mutateAsync({
          collegeId: confirmAction.extraId,
          userId: confirmAction.userId,
        });
      } else if (confirmAction.type === "revoke_company_admin" && confirmAction.extraId) {
        await removeCompanyAdmin.mutateAsync({
          companyId: confirmAction.extraId,
          userId: confirmAction.userId,
          officeCity: confirmAction.extraCity,
        });
      }
    } catch {
      // hook shows toast
    } finally {
      setConfirmAction(null);
    }
  };

  const isPending =
    updateUserStatus.isPending ||
    assignPlatformAdmin.isPending ||
    removePlatformAdmin.isPending ||
    removeCollegeAdmin.isPending ||
    removeCompanyAdmin.isPending;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Platform Admin Console</h1>
          <p className="text-sm text-slate-500">
            Monitor system activities, manage user permissions, and moderate colleges and partner companies.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
          <ShieldCheck size={14} className="text-emerald-700" />
          <span>Super Admin Access</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded-xl border p-1 shadow-sm">
        {(["overview", "users", "colleges", "companies"] as Tab[]).map((tab) => (
          <button
            key={tab}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all
              ${activeTab === tab
                ? "bg-emerald-700 text-white shadow"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            onClick={() => {
              setActiveTab(tab);
              setSelectedCollege(null);
              setSelectedCompany(null);
            }}
          >
            {tab === "overview" && <Activity size={14} />}
            {tab === "users" && <Users size={14} />}
            {tab === "colleges" && <GraduationCap size={14} />}
            {tab === "companies" && <Building2 size={14} />}
            {titleCase(tab)}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="min-h-[50vh]">
        {activeTab === "overview" && (
          <OverviewPanel stats={statsQuery.data} loading={statsQuery.isFetching} error={statsQuery.error} onRetry={statsQuery.refetch} />
        )}
        {activeTab === "users" && (
          <UsersPanel
            onAction={(type, userId, label) => setConfirmAction({ type, userId, label })}
            currentUserId={currentUser?.id}
          />
        )}
        {activeTab === "colleges" && (
          <CollegesPanel
            selectedCollege={selectedCollege}
            onSelectCollege={setSelectedCollege}
            onRevokeAdmin={(collegeId, userId, label) => setConfirmAction({ type: "revoke_college_admin", userId, label, extraId: collegeId })}
          />
        )}
        {activeTab === "companies" && (
          <CompaniesPanel
            selectedCompany={selectedCompany}
            onSelectCompany={setSelectedCompany}
            onRevokeAdmin={(companyId, userId, label, officeCity) => setConfirmAction({ type: "revoke_company_admin", userId, label, extraId: companyId, extraCity: officeCity })}
          />
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction?.type === "ban"
            ? "Ban User"
            : confirmAction?.type === "activate"
            ? "Activate User"
            : confirmAction?.type === "grant_admin"
            ? "Grant Admin Rights"
            : confirmAction?.type === "revoke_admin"
            ? "Revoke Admin Rights"
            : "Revoke Admin Scope"
        }
        message={
          confirmAction?.type === "ban" ? (
            <p>
              Are you sure you want to ban user <strong>{confirmAction.label}</strong>? Banned users will be locked out of the platform.
            </p>
          ) : confirmAction?.type === "activate" ? (
            <p>
              Are you sure you want to reactivate user <strong>{confirmAction.label}</strong>? They will regain full access to their account.
            </p>
          ) : confirmAction?.type === "grant_admin" ? (
            <p>
              Are you sure you want to grant <strong>PLATFORM_ADMIN</strong> privileges to <strong>{confirmAction.label}</strong>? This gives them access to this admin console.
            </p>
          ) : confirmAction?.type === "revoke_admin" ? (
            <p>
              Are you sure you want to revoke <strong>PLATFORM_ADMIN</strong> privileges from <strong>{confirmAction.label}</strong>? They will lose access to this console.
            </p>
          ) : (
            <p>
              Are you sure you want to revoke admin permissions from <strong>{confirmAction?.label}</strong> for this scope?
            </p>
          )
        }
        confirmLabel={
          confirmAction?.type === "ban"
            ? "Ban User"
            : confirmAction?.type === "activate"
            ? "Activate"
            : confirmAction?.type === "grant_admin"
            ? "Grant Admin"
            : confirmAction?.type === "revoke_admin"
            ? "Revoke Admin"
            : "Revoke"
        }
        variant={confirmAction?.type === "ban" || confirmAction?.type?.startsWith("revoke") ? "danger" : "default"}
        isPending={isPending}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

// ─── OVERVIEW PANEL ───────────────────────────────────────────────────────────

function OverviewPanel({
  stats,
  loading,
  error,
  onRetry,
}: {
  stats: any;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (loading) return <InlineLoader label="Loading statistics..." />;
  if (error) return <ErrorState title="Stats query failed" text="Unable to aggregate database statistics" onRetry={onRetry} />;
  if (!stats) return <p className="text-slate-500 italic">No metrics returned.</p>;

  return (
    <div className="space-y-6">
      {/* Metric Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Total Users" value={stats.userCount} icon={Users} color="from-emerald-500 to-teal-600" />
        <MetricCard label="Colleges" value={stats.collegeCount} icon={GraduationCap} color="from-blue-500 to-indigo-600" />
        <MetricCard label="Companies" value={stats.companyCount} icon={Building2} color="from-violet-500 to-purple-600" />
        <MetricCard label="Projects" value={stats.projectCount} icon={Globe} color="from-amber-500 to-orange-600" />
        <MetricCard label="Job Listings" value={stats.jobCount} icon={Briefcase} color="from-rose-500 to-pink-600" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-800">User Account Status</h3>
          <div className="space-y-3">
            {stats.statusDistribution.map((item: any) => {
              const percentage = stats.userCount ? Math.round((item.count / stats.userCount) * 100) : 0;
              const color =
                item.status === "ACTIVE"
                  ? "bg-emerald-600"
                  : item.status === "BANNED"
                  ? "bg-rose-600"
                  : "bg-slate-400";
              return (
                <div key={item.status} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{titleCase(item.status)}</span>
                    <span className="text-slate-500">
                      {item.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trust Level Distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-800">Trust Level Spread</h3>
          <div className="space-y-3">
            {stats.trustLevelDistribution.map((item: any) => {
              const percentage = stats.userCount ? Math.round((item.count / stats.userCount) * 100) : 0;
              return (
                <div key={item.trustLevel} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{titleCase(item.trustLevel)}</span>
                    <span className="text-slate-500">
                      {item.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-600" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-2xl font-black text-slate-900 leading-none">{value}</div>
        <div className="mt-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

// ─── USERS PANEL ──────────────────────────────────────────────────────────────

function UsersPanel({
  onAction,
  currentUserId,
}: {
  onAction: (
    type: "ban" | "activate" | "grant_admin" | "revoke_admin",
    userId: string,
    label: string,
  ) => void;
  currentUserId?: string;
}) {
  const [search, setSearch] = useState("");
  const usersQuery = useAdminUsersQuery(search);

  const pages = usersQuery.data?.pages || [];
  const users = pages.flatMap((page) => page.users || []);

  return (
    <div className="space-y-4">
      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          className="field pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name, username, email..."
        />
      </div>

      {/* Users List */}
      {usersQuery.isPending ? (
        <InlineLoader label="Querying user database..." />
      ) : users.length === 0 ? (
        <p className="text-slate-500 italic py-10 text-center">No users match query filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Trust Level</th>
                <th className="px-6 py-3">Roles</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {users.map((u) => {
                const isBanned = u.status === "BANNED";
                const isPlatformAdmin = u.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN");
                const label = userName(u);

                return (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} size="md" />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{label}</div>
                          <div className="text-xxs text-slate-400">@{u.username}</div>
                          <div className="text-xxs text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1
                          ${isBanned
                            ? "bg-rose-50 text-rose-700 ring-rose-250"
                            : "bg-emerald-50 text-emerald-700 ring-emerald-250"
                          }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600">{titleCase(u.trustLevel || "BEGINNER")}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles?.map((ur: any) => (
                          <span
                            key={ur.role?.name}
                            className={`rounded px-1.5 py-0.5 text-[9px] font-semibold border
                              ${ur.role?.name === "PLATFORM_ADMIN"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : ur.role?.name?.endsWith("ADMIN")
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}
                          >
                            {ur.role?.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Ban / Activate */}
                        {isBanned ? (
                          <button
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-emerald-50 hover:text-emerald-700 transition"
                            onClick={() => onAction("activate", u.id, label)}
                          >
                            Activate
                          </button>
                        ) : (
                          <button
                            className="rounded-lg border border-slate-250 bg-white px-2.5 py-1.5 hover:bg-rose-50 hover:text-rose-700 text-slate-650 transition"
                            onClick={() => onAction("ban", u.id, label)}
                            disabled={u.id === currentUserId}
                          >
                            Ban User
                          </button>
                        )}

                        {/* Platform Admin Toggle */}
                        {isPlatformAdmin ? (
                          <button
                            className="rounded-lg border border-red-250 bg-red-50 text-red-700 px-2.5 py-1.5 hover:bg-red-100 transition font-bold"
                            onClick={() => onAction("revoke_admin", u.id, label)}
                            disabled={u.id === currentUserId}
                            title={u.id === currentUserId ? "Cannot revoke yourself" : ""}
                          >
                            Revoke Admin
                          </button>
                        ) : (
                          <button
                            className="rounded-lg border border-slate-250 bg-white px-2.5 py-1.5 hover:bg-emerald-50 hover:text-emerald-700 transition font-bold"
                            onClick={() => onAction("grant_admin", u.id, label)}
                            disabled={isBanned}
                          >
                            Make Admin
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {usersQuery.hasNextPage && (
        <button
          className="btn-secondary w-full"
          onClick={() => usersQuery.fetchNextPage()}
          disabled={usersQuery.isFetchingNextPage}
        >
          {usersQuery.isFetchingNextPage ? <Loader2 className="animate-spin" size={15} /> : "Load More Users"}
        </button>
      )}
    </div>
  );
}

// ─── COLLEGES PANEL ───────────────────────────────────────────────────────────

function CollegesPanel({
  selectedCollege,
  onSelectCollege,
  onRevokeAdmin,
}: {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createCollege.mutateAsync({
        name,
        city: city || undefined,
        state: state || undefined,
        website: website || undefined,
        logoUrl: logoUrl || undefined,
      });
      setName("");
      setCity("");
      setState("");
      setWebsite("");
      setLogoUrl("");
    } catch {
      // handled
    }
  };

  const colleges = collegesQuery.data?.pages?.flatMap((p) => p.colleges) || [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      {/* College Listing */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-950">Colleges List</h2>
        {collegesQuery.isPending ? (
          <InlineLoader label="Loading colleges..." />
        ) : colleges.length === 0 ? (
          <p className="text-slate-500 italic">No colleges listed yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {colleges.map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectCollege(c)}
                className={`cursor-pointer rounded-xl border p-4 transition shadow-sm hover:shadow-md hover:border-emerald-300
                  ${selectedCollege?.id === c.id ? "bg-emerald-50/40 border-emerald-500" : "bg-white border-slate-200"}`}
              >
                <div className="font-bold text-slate-900">{c.name}</div>
                <div className="mt-1 text-xxs text-slate-400">
                  {[c.city, c.state].filter(Boolean).join(", ") || "No location listed"}
                </div>
                {c.website && (
                  <a
                    href={c.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xxs text-emerald-800 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Visit Site <ExternalLink size={10} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* College Actions Sidebar */}
      <div className="space-y-6">
        {selectedCollege ? (
          <CollegeAdminsPanel
            college={selectedCollege}
            onClose={() => onSelectCollege(null)}
            onRevoke={(userId, label) => onRevokeAdmin(selectedCollege.id, userId, label)}
          />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-800">Add New College</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-slate-500">Name *</span>
                <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="MIT, Stanford..." required />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs">
                  <span className="mb-1 block font-semibold text-slate-500">City</span>
                  <input className="field" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Boston" />
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block font-semibold text-slate-500">State</span>
                  <input className="field" value={state} onChange={(e) => setState(e.target.value)} placeholder="MA" />
                </label>
              </div>
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-slate-500">Website</span>
                <input className="field" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." type="url" />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-slate-500">Logo URL</span>
                <input className="field" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." type="url" />
              </label>
              <button className="btn-primary w-full mt-2" type="submit" disabled={createCollege.isPending}>
                {createCollege.isPending ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}
                Add College
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function CollegeAdminsPanel({
  college,
  onClose,
  onRevoke,
}: {
  college: College;
  onClose: () => void;
  onRevoke: (userId: string, label: string) => void;
}) {
  const adminsQuery = useListCollegeAdminsQuery(college.id);
  const assignAdmin = useAssignCollegeAdminMutation();
  const [targetUserId, setTargetUserId] = useState("");

  const handleAssign = async (e: FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim()) return;

    try {
      await assignAdmin.mutateAsync({ collegeId: college.id, userId: targetUserId.trim() });
      setTargetUserId("");
    } catch {
      // handled
    }
  };

  const admins = adminsQuery.data || [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5 relative">
      <button className="absolute right-4 top-4 text-slate-400 hover:text-slate-600" onClick={onClose}>
        <X size={16} />
      </button>

      <div>
        <h3 className="font-bold text-slate-900 pr-6">{college.name} Admins</h3>
        <p className="text-xxs text-slate-400">Manage individuals delegated to moderate this college community.</p>
      </div>

      {/* Assign Form */}
      <form onSubmit={handleAssign} className="flex gap-2">
        <input
          className="field text-xs flex-1"
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          placeholder="User UUID to make admin..."
          required
        />
        <button className="btn-primary shrink-0" type="submit" disabled={assignAdmin.isPending}>
          {assignAdmin.isPending ? <Loader2 className="animate-spin" size={13} /> : <Plus size={13} />}
          Add
        </button>
      </form>

      {/* Admins List */}
      <div className="space-y-2 border-t border-slate-100 pt-3">
        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Assigned Admins</h4>
        {adminsQuery.isPending ? (
          <InlineLoader label="Fetching admins..." />
        ) : admins.length === 0 ? (
          <p className="text-slate-500 text-xxs italic">No administrators assigned yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-56 overflow-auto pr-1">
            {admins.map((admin: any) => {
              const u = admin.user;
              const label = userName(u);
              return (
                <div key={admin.id} className="flex items-center justify-between py-2 text-xxs">
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <Avatar user={u} size="sm" />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 truncate">{label}</div>
                      <div className="text-slate-400 truncate">@{u.username}</div>
                    </div>
                  </div>
                  <button
                    className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition shrink-0"
                    onClick={() => onRevoke(u.id, label)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── COMPANIES PANEL ──────────────────────────────────────────────────────────

function CompaniesPanel({
  selectedCompany,
  onSelectCompany,
  onRevokeAdmin,
}: {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createCompany.mutateAsync({
        name,
        websiteUrl: website || undefined,
        logoUrl: logoUrl || undefined,
        description: description || undefined,
      });
      setName("");
      setWebsite("");
      setLogoUrl("");
      setDescription("");
    } catch {
      // handled
    }
  };

  const companies = companiesQuery.data?.companies || [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      {/* Companies Listing */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-950">Companies List</h2>
        {companiesQuery.isPending ? (
          <InlineLoader label="Loading companies..." />
        ) : companies.length === 0 ? (
          <p className="text-slate-500 italic">No companies listed yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {companies.map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectCompany(c)}
                className={`cursor-pointer rounded-xl border p-4 transition shadow-sm hover:shadow-md hover:border-emerald-300
                  ${selectedCompany?.id === c.id ? "bg-emerald-50/40 border-emerald-500" : "bg-white border-slate-200"}`}
              >
                <div className="font-bold text-slate-900">{c.name}</div>
                {c.description && (
                  <p className="mt-1 text-xxs text-slate-500 line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>
                )}
                {c.websiteUrl && (
                  <a
                    href={c.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xxs text-emerald-800 hover:underline font-semibold"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Company Website <ExternalLink size={10} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Company Actions Sidebar */}
      <div className="space-y-6">
        {selectedCompany ? (
          <CompanyAdminsPanel
            company={selectedCompany}
            onClose={() => onSelectCompany(null)}
            onRevoke={(userId, label, officeCity) => onRevokeAdmin(selectedCompany.id, userId, label, officeCity)}
          />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-800">Add New Partner Company</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-slate-500">Company Name *</span>
                <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Google, Microsoft..." required />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-slate-500">Website URL</span>
                <input className="field" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." type="url" />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-slate-500">Logo Icon URL</span>
                <input className="field" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." type="url" />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-slate-500">Brief Description</span>
                <textarea className="field min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the company's business domain..." />
              </label>
              <button className="btn-primary w-full mt-2" type="submit" disabled={createCompany.isPending}>
                {createCompany.isPending ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}
                Add Company
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyAdminsPanel({
  company,
  onClose,
  onRevoke,
}: {
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
      await assignAdmin.mutateAsync({
        companyId: company.id,
        userId: targetUserId.trim(),
        officeCity: officeCity.trim() || undefined,
      });
      setTargetUserId("");
      setOfficeCity("");
    } catch {
      // handled
    }
  };

  const admins = adminsQuery.data || [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5 relative">
      <button className="absolute right-4 top-4 text-slate-400 hover:text-slate-600" onClick={onClose}>
        <X size={16} />
      </button>

      <div>
        <h3 className="font-bold text-slate-900 pr-6">{company.name} Admins</h3>
        <p className="text-xxs text-slate-400">Grant admin privileges scoped to specific office locations.</p>
      </div>

      {/* Assign Form */}
      <form onSubmit={handleAssign} className="space-y-2 border border-slate-100 rounded-lg p-3 bg-slate-50/40">
        <label className="block text-[10px] font-bold text-slate-500 uppercase">New Assignment</label>
        <input
          className="field text-xs"
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          placeholder="User UUID..."
          required
        />
        <input
          className="field text-xs"
          value={officeCity}
          onChange={(e) => setOfficeCity(e.target.value)}
          placeholder="Office City Scope (optional)..."
        />
        <button className="btn-primary w-full py-1.5" type="submit" disabled={assignAdmin.isPending}>
          {assignAdmin.isPending ? <Loader2 className="animate-spin" size={13} /> : <Plus size={13} />}
          Add Admin
        </button>
      </form>

      {/* Admins List */}
      <div className="space-y-2 border-t border-slate-100 pt-3">
        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Assigned Admins</h4>
        {adminsQuery.isPending ? (
          <InlineLoader label="Fetching admins..." />
        ) : admins.length === 0 ? (
          <p className="text-slate-500 text-xxs italic">No administrators assigned yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-56 overflow-auto pr-1">
            {admins.map((admin: any) => {
              const u = admin.user;
              const label = userName(u);
              return (
                <div key={admin.id} className="flex items-center justify-between py-2 text-xxs">
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <Avatar user={u} size="sm" />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 truncate">{label}</div>
                      <div className="text-slate-450 truncate">
                        {admin.officeCity ? `Scope: ${admin.officeCity}` : "Global Admin"}
                      </div>
                    </div>
                  </div>
                  <button
                    className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition shrink-0"
                    onClick={() => onRevoke(u.id, label, admin.officeCity)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
