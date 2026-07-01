import { useState, lazy, Suspense } from "react";
import {
  LayoutDashboard, Users, Shield, Trophy, GraduationCap, Building2,
  Hash, GitBranch, Briefcase, ShieldCheck, RefreshCw, ClipboardList,
  Calendar, Globe, UserCheck, Video,
} from "lucide-react";
import { useAuth } from "../core/contexts/AuthContext";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { PageLoader } from "../components/ui";
import {
  useAdminStatsQuery,
  useUpdateUserStatusMutation,
  useAssignPlatformAdminMutation,
  useRemovePlatformAdminMutation,
  useRemoveCollegeAdminMutation,
  useRemoveCompanyAdminMutation,
  useAssignCollegeAdminMutation,
  useAssignCompanyAdminMutation,
} from "../hooks/usePlatformQueries";
import { College, Company } from "../lib/api";

// Sub-panel lazy imports
const OverviewPanel = lazy(() => import("./AdminPages/OverviewPanel").then(m => ({ default: m.OverviewPanel })));
const UsersPanel = lazy(() => import("./AdminPages/UsersPanel").then(m => ({ default: m.UsersPanel })));
const ModerationPanel = lazy(() => import("./AdminPages/ModerationPanel").then(m => ({ default: m.ModerationPanel })));
const HackathonsPanel = lazy(() => import("./AdminPages/HackathonsPanel").then(m => ({ default: m.HackathonsPanel })));
const CollegesPanel = lazy(() => import("./AdminPages/CollegesPanel").then(m => ({ default: m.CollegesPanel })));
const CompaniesPanel = lazy(() => import("./AdminPages/CompaniesPanel").then(m => ({ default: m.CompaniesPanel })));
const CommunitiesPanel = lazy(() => import("./AdminPages/CommunitiesPanel").then(m => ({ default: m.CommunitiesPanel })));
const ReferralsPanel = lazy(() => import("./AdminPages/ReferralsPanel").then(m => ({ default: m.ReferralsPanel })));
const CompanyRequestsPanel = lazy(() => import("./AdminPages/CompanyRequestsPanel").then(m => ({ default: m.CompanyRequestsPanel })));
const OnboardingRequestsPanel = lazy(() => import("./AdminPages/OnboardingRequestsPanel").then(m => ({ default: m.OnboardingRequestsPanel })));
const JobsPanel = lazy(() => import("./AdminPages/JobsPanel").then(m => ({ default: m.JobsPanel })));
const EventsPanel = lazy(() => import("./AdminPages/EventsPanel").then(m => ({ default: m.EventsPanel })));
const DiscoveredCompaniesPanel = lazy(() => import("./AdminPages/DiscoveredCompaniesPanel").then(m => ({ default: m.DiscoveredCompaniesPanel })));
const InterviewPanel = lazy(() => import("./AdminPages/InterviewPanel").then(m => ({ default: m.InterviewPanel })));

type Tab = "overview" | "users" | "moderation" | "hackathons" | "colleges" | "companies" | "communities" | "referrals" | "company_requests" | "onboarding" | "jobs" | "events" | "discovered_companies" | "interviews";

const NAV_ITEMS: { id: Tab; label: string; icon: any; badge?: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "moderation", label: "Moderation", icon: Shield },
  { id: "hackathons", label: "Hackathons", icon: Trophy },
  { id: "colleges", label: "Colleges", icon: GraduationCap },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "communities", label: "Communities", icon: Hash },
  { id: "referrals", label: "Referrals", icon: GitBranch },
  { id: "company_requests", label: "Co. Requests", icon: ClipboardList },
  { id: "onboarding",       label: "Onboarding",    icon: UserCheck },
  { id: "events",           label: "Events",         icon: Calendar },
  { id: "discovered_companies", label: "Discovered",  icon: Globe },
  { id: "interviews",       label: "Interviews",     icon: Video },
];

export function AdminPage() {
  const { user: currentUser } = useAuth();
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
  const assignCollegeAdmin = useAssignCollegeAdminMutation();
  const assignCompanyAdmin = useAssignCompanyAdminMutation();

  const statsQuery = useAdminStatsQuery();

  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const [confirmAction, setConfirmAction] = useState<{
    type: "ban" | "activate" | "grant_admin" | "revoke_admin" | "revoke_college_admin" | "revoke_company_admin" | "assign_college_admin" | "assign_company_admin";
    userId: string;
    label: string;
    extraId?: string;
    extraCity?: string;
    extraName?: string;
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
      } else if (confirmAction.type === "assign_college_admin" && confirmAction.extraId) {
        await assignCollegeAdmin.mutateAsync({ collegeId: confirmAction.extraId, userId: confirmAction.userId });
      } else if (confirmAction.type === "assign_company_admin" && confirmAction.extraId) {
        await assignCompanyAdmin.mutateAsync({ companyId: confirmAction.extraId, userId: confirmAction.userId, officeCity: confirmAction.extraCity });
      }
    } catch { /* hook shows toast */ }
    finally { setConfirmAction(null); }
  };

  const isPending =
    updateUserStatus.isPending || assignPlatformAdmin.isPending ||
    removePlatformAdmin.isPending || removeCollegeAdmin.isPending || removeCompanyAdmin.isPending ||
    assignCollegeAdmin.isPending || assignCompanyAdmin.isPending;

  const stats = statsQuery.data;

  return (
    <div className="min-h-screen" style={{ color: "var(--text-primary)" }}>
      <div className="mx-auto max-w-screen-xl px-4 py-6">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-teal-600">
                <ShieldCheck size={16} className="text-white" />
              </div>
              Platform Admin Console
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Monitor, moderate, and manage the engineering platform.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => statsQuery.refetch()}
              className="btn-secondary text-xs"
            >
              <RefreshCw size={12} className={statsQuery.isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-indigo-600/40 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
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
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all border
                    ${activeTab === id
                      ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-600/20"
                      : "border-transparent hover:bg-[var(--bg-surface-2)]"
                    }`}
                  style={activeTab !== id ? { color: "var(--text-muted)" } : {}}
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
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all border
                  ${activeTab === id ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-600/20" : "hover:bg-[var(--bg-surface-2)]"}`}
                style={activeTab !== id ? { borderColor: "var(--border)", color: "var(--text-muted)" } : {}}
                onClick={() => { setActiveTab(id); setSelectedCollege(null); setSelectedCompany(null); }}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* ── Main Content ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <Suspense fallback={<PageLoader />}>
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
                  onAssignAdmin={(collegeId, userId, label, collegeName) =>
                    setConfirmAction({ type: "assign_college_admin", userId, label, extraId: collegeId, extraName: collegeName })
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
                  onAssignAdmin={(companyId, userId, label, companyName, officeCity) =>
                    setConfirmAction({ type: "assign_company_admin", userId, label, extraId: companyId, extraName: companyName, extraCity: officeCity })
                  }
                />
              )}
              {activeTab === "communities" && <CommunitiesPanel />}
              {activeTab === "referrals" && <ReferralsPanel />}
              {activeTab === "company_requests" && <CompanyRequestsPanel />}
              {activeTab === "onboarding" && <OnboardingRequestsPanel />}
              {activeTab === "jobs" && <JobsPanel />}
              {activeTab === "events" && <EventsPanel />}
              {activeTab === "discovered_companies" && <DiscoveredCompaniesPanel />}
              {activeTab === "interviews" && <InterviewPanel />}
            </Suspense>
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
          confirmAction?.type === "revoke_admin" ? "Revoke Admin Rights" :
          confirmAction?.type === "assign_college_admin" ? "Assign College Admin" :
          confirmAction?.type === "assign_company_admin" ? "Assign Company Admin" :
          "Revoke Admin Scope"
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
          ) : confirmAction?.type === "assign_college_admin" ? (
            <p>Are you sure you want to assign <strong>{confirmAction.label}</strong> as administrator for <strong>{confirmAction.extraName}</strong>? They will receive a notification.</p>
          ) : confirmAction?.type === "assign_company_admin" ? (
            <p>Are you sure you want to assign <strong>{confirmAction.label}</strong> as administrator for <strong>{confirmAction.extraName}</strong>{confirmAction.extraCity ? ` (${confirmAction.extraCity} office)` : " (Global)"}? They will receive a notification.</p>
          ) : (
            <p>Revoke admin from <strong>{confirmAction?.label}</strong> for this scope?</p>
          )
        }
        confirmLabel={
          confirmAction?.type === "ban" ? "Ban User" :
          confirmAction?.type === "activate" ? "Activate" :
          confirmAction?.type === "grant_admin" ? "Grant Admin" :
          confirmAction?.type === "revoke_admin" ? "Revoke Admin" :
          confirmAction?.type === "assign_college_admin" || confirmAction?.type === "assign_company_admin" ? "Assign Admin" :
          "Revoke"
        }
        variant={confirmAction?.type === "ban" || confirmAction?.type?.startsWith("revoke") ? "danger" : "default"}
        isPending={isPending}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
