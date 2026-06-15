import { useState } from "react";
import {
  LayoutDashboard, Users, Shield, Trophy, GraduationCap, Building2,
  Hash, GitBranch, Briefcase, ShieldCheck, RefreshCw,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
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

// Sub-panel imports
import { OverviewPanel } from "./AdminPages/OverviewPanel";
import { UsersPanel } from "./AdminPages/UsersPanel";
import { ModerationPanel } from "./AdminPages/ModerationPanel";
import { HackathonsPanel } from "./AdminPages/HackathonsPanel";
import { CollegesPanel } from "./AdminPages/CollegesPanel";
import { CompaniesPanel } from "./AdminPages/CompaniesPanel";
import { CommunitiesPanel } from "./AdminPages/CommunitiesPanel";
import { ReferralsPanel } from "./AdminPages/ReferralsPanel";
import { CompanyRequestsPanel } from "./AdminPages/CompanyRequestsPanel";

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
