import { useState, useMemo, FormEvent, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Building2, Users, Briefcase, Shield, ShieldCheck, Plus, MapPin, Loader2,
  TrendingUp, ArrowLeft, RefreshCw, Settings
} from "lucide-react";
import { useAuth } from "../core/contexts/AuthContext";
import { useToast } from "../core/contexts/ToastContext";
import { api } from "../lib/api";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { useFileUpload } from "../features/storage/hooks/useFileUpload";
import {
  useCompanyQuery,
  useCompanyJobsQuery,
  useCompanyAdminStatsQuery,
  useCompanyAdminsForDashboardQuery,
  useCompanyRecruitersQuery,
  useAssignCompanyAdminFromDashboardMutation,
  useRemoveCompanyAdminFromDashboardMutation,
  useAssignCompanyRecruiterMutation,
  useRemoveCompanyRecruiterMutation,
  useUpdateCompanyMutation
} from "../hooks/usePlatformQueries";

// Presentational Sections
import { OverviewSection } from "../components/company-admin/OverviewSection";
import { TeamSection } from "../components/company-admin/TeamSection";
import { MembersSection } from "../components/company-admin/MembersSection";
import { JobsSection } from "../components/company-admin/JobsSection";
import { OfficesSection } from "../components/company-admin/OfficesSection";
import { DepartmentsSection } from "../components/company-admin/DepartmentsSection";
import { SettingsSection } from "../components/company-admin/SettingsSection";

type Tab = "overview" | "managers" | "recruiters" | "jobs" | "offices" | "departments" | "settings";

export function CompanyAdminPage() {
  const { companySlug } = useParams<{ companySlug: string }>();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [jobPage, setJobPage] = useState(1);
  const [managedJobId, setManagedJobId] = useState<string | null>(null);

  const companyQuery = useCompanyQuery(companySlug);
  const company = companyQuery.data;
  const companyId = company?.id;

  const { upload: uploadLogo, uploading: uploadingLogo } = useFileUpload();
  const { upload: uploadCover, uploading: uploadingCover } = useFileUpload();
  const updateCompanyMutation = useUpdateCompanyMutation();

  const [settingsForm, setSettingsForm] = useState({
    name: "", tagline: "", description: "", headquarters: "", industry: "",
    websiteUrl: "", careersPageUrl: "", logoUrl: "", coverImageUrl: "", githubUrl: "",
    foundedYear: "", type: "" as "" | any, size: "" as "" | any,
    hiringEnabled: true, referralEnabled: true,
  });

  const [hasInitializedSettings, setHasInitializedSettings] = useState(false);
  useEffect(() => {
    if (company && !hasInitializedSettings) {
      setSettingsForm({
        name: company.name || "",
        tagline: company.tagline || "",
        description: company.description || "",
        headquarters: company.headquarters || "",
        industry: company.industry || "",
        websiteUrl: company.websiteUrl || "",
        careersPageUrl: company.careersPageUrl || "",
        logoUrl: company.logoUrl || "",
        coverImageUrl: company.coverImageUrl || "",
        githubUrl: company.githubUrl || "",
        foundedYear: company.foundedYear ? String(company.foundedYear) : "",
        type: company.type || "",
        size: company.size || "",
        hiringEnabled: company.hiringEnabled !== false,
        referralEnabled: company.referralEnabled !== false,
      });
      setHasInitializedSettings(true);
    }
  }, [company, hasInitializedSettings]);

  const updateSetting = (key: string, value: any) => {
    setSettingsForm((p) => ({ ...p, [key]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadLogo(file, "avatar");
      updateSetting("logoUrl", res.fileUrl);
    } catch {}
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadCover(file, "avatar");
      updateSetting("coverImageUrl", res.fileUrl);
    } catch {}
  };

  const handleSettingsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    try {
      await updateCompanyMutation.mutateAsync({
        companyId,
        payload: {
          name: settingsForm.name,
          tagline: settingsForm.tagline || undefined,
          description: settingsForm.description || undefined,
          headquarters: settingsForm.headquarters || undefined,
          industry: settingsForm.industry || undefined,
          websiteUrl: settingsForm.websiteUrl || undefined,
          careersPageUrl: settingsForm.careersPageUrl || undefined,
          logoUrl: settingsForm.logoUrl || undefined,
          coverImageUrl: settingsForm.coverImageUrl || undefined,
          githubUrl: settingsForm.githubUrl || undefined,
          foundedYear: settingsForm.foundedYear ? Number(settingsForm.foundedYear) : undefined,
          type: settingsForm.type || undefined,
          size: settingsForm.size || undefined,
          hiringEnabled: settingsForm.hiringEnabled,
          referralEnabled: settingsForm.referralEnabled,
        }
      });
      showToast("success", "Company profile updated successfully!");
    } catch {}
  };

  // Queries
  const statsQuery = useCompanyAdminStatsQuery(companyId || "");
  const adminsQuery = useCompanyAdminsForDashboardQuery(companyId || "");
  const recruitersQuery = useCompanyRecruitersQuery(companyId || "");
  const companyJobsQuery = useCompanyJobsQuery(companyId, jobPage, 10);

  // Mutations
  const assignAdmin = useAssignCompanyAdminFromDashboardMutation();
  const removeAdmin = useRemoveCompanyAdminFromDashboardMutation();
  const assignRecruiter = useAssignCompanyRecruiterMutation();
  const removeRecruiter = useRemoveCompanyRecruiterMutation();

  // Dialog State
  const [confirmAction, setConfirmAction] = useState<{
    type: "assign_manager" | "revoke_manager" | "assign_recruiter" | "revoke_recruiter";
    userId: string;
    label: string;
    officeCity?: string;
    recruiterTitle?: string;
  } | null>(null);

  // Form inputs inside tabs
  const [targetUserId, setTargetUserId] = useState("");
  const [targetUserLabel, setTargetUserLabel] = useState("");
  const [officeCity, setOfficeCity] = useState("");
  const [recruiterTitle, setRecruiterTitle] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Office form states
  const [officeName, setOfficeName] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [officeCityInput, setOfficeCityInput] = useState("");
  const [officeManagerId, setOfficeManagerId] = useState("");
  const [submittingOffice, setSubmittingOffice] = useState(false);

  // Department form states
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [submittingDept, setSubmittingDept] = useState(false);

  const stats = statsQuery.data;
  const admins = adminsQuery.data || [];
  const recruiters = recruitersQuery.data || [];

  const globalAdmins = admins.filter((a: any) => !a.officeCity);
  const officeManagers = admins.filter((a: any) => a.officeCity);

  const isGlobalAdmin = useMemo(() => {
    if (!currentUser || !companyId) return false;
    const adminship = currentUser.companyAdminships?.find(
      (a: any) => a.companyId === companyId
    );
    return !!adminship && (adminship.officeCity === null || adminship.officeCity === undefined);
  }, [currentUser, companyId]);

  const tabs = useMemo(() => {
    const list = [
      { id: "overview" as Tab, label: "Stats & Funnel", icon: TrendingUp },
      { id: "managers" as Tab, label: "Office Managers", icon: Shield },
      { id: "recruiters" as Tab, label: "Recruiter Seats", icon: Users },
      { id: "jobs" as Tab, label: "Job Postings", icon: Briefcase },
    ];
    if (isGlobalAdmin) {
      list.push(
        { id: "offices" as Tab, label: "Manage Offices", icon: MapPin },
        { id: "departments" as Tab, label: "Departments", icon: Building2 },
        { id: "settings" as Tab, label: "Profile Settings", icon: Settings }
      );
    }
    return list;
  }, [isGlobalAdmin]);

  const isPending =
    assignAdmin.isPending ||
    removeAdmin.isPending ||
    assignRecruiter.isPending ||
    removeRecruiter.isPending ||
    updateCompanyMutation.isPending;

  const handleConfirmAction = async () => {
    if (!confirmAction || !companyId) return;

    try {
      if (confirmAction.type === "assign_manager") {
        await assignAdmin.mutateAsync({
          companyId,
          userId: confirmAction.userId,
          officeCity: confirmAction.officeCity || undefined
        });
      } else if (confirmAction.type === "revoke_manager") {
        await removeAdmin.mutateAsync({
          companyId,
          userId: confirmAction.userId,
          officeCity: confirmAction.officeCity || undefined
        });
      } else if (confirmAction.type === "assign_recruiter") {
        await assignRecruiter.mutateAsync({
          companyId,
          userId: confirmAction.userId,
          title: confirmAction.recruiterTitle || undefined
        });
      } else if (confirmAction.type === "revoke_recruiter") {
        await removeRecruiter.mutateAsync({
          companyId,
          userId: confirmAction.userId
        });
      }
      statsQuery.refetch();
    } catch {
    } finally {
      setConfirmAction(null);
    }
  };

  const handleAddManager = (userId: string, city: string) => {
    setConfirmAction({
      type: "assign_manager",
      userId,
      label: targetUserLabel || userId,
      officeCity: city
    });
    setTargetUserId("");
    setTargetUserLabel("");
    setOfficeCity("");
    setShowAddForm(false);
  };

  const handleAddRecruiter = (userId: string, title: string) => {
    setConfirmAction({
      type: "assign_recruiter",
      userId,
      label: targetUserLabel || userId,
      recruiterTitle: title
    });
    setTargetUserId("");
    setTargetUserLabel("");
    setRecruiterTitle("");
    setShowAddForm(false);
  };

  const handleCreateOffice = async (e: FormEvent) => {
    e.preventDefault();
    if (!officeName.trim() || !officeCityInput.trim() || !companyId) return;
    setSubmittingOffice(true);
    try {
      await api.createCompanyOffice(companyId, {
        name: officeName,
        address: officeAddress || undefined,
        city: officeCityInput,
        managerId: officeManagerId || null,
      });
      setOfficeName("");
      setOfficeAddress("");
      setOfficeCityInput("");
      setOfficeManagerId("");
      setShowAddForm(false);
      companyQuery.refetch();
      statsQuery.refetch();
      showToast("success", "Office location created successfully!");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to create office location");
    } finally {
      setSubmittingOffice(false);
    }
  };

  const handleCreateDept = async (e: FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !companyId) return;
    setSubmittingDept(true);
    try {
      await api.createCompanyDepartment(companyId, {
        name: deptName,
        code: deptCode || undefined,
      });
      setDeptName("");
      setDeptCode("");
      setShowAddForm(false);
      companyQuery.refetch();
      showToast("success", "Department created successfully!");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to create department");
    } finally {
      setSubmittingDept(false);
    }
  };

  const loading =
    companyQuery.isFetching ||
    statsQuery.isFetching ||
    adminsQuery.isFetching ||
    recruitersQuery.isFetching ||
    companyJobsQuery.isFetching;

  if (companyQuery.isLoading || (companyId && statsQuery.isLoading)) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3" style={{ color: "var(--text-muted)" }}>
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <p className="text-sm font-semibold">Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (companyQuery.isError || !company || statsQuery.isError || !stats) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border p-6 text-center mt-20" style={{ borderColor: "var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)" }}>
        <Shield size={36} className="mx-auto text-rose-500 mb-3" />
        <h3 className="font-bold text-lg">Access Denied / Load Failed</h3>
        <p className="text-sm mt-2 mb-4" style={{ color: "var(--text-muted)" }}>
          You must be a Global Administrator of the company to view this dashboard, or the server failed to respond.
        </p>
        <Link to="/companies" className="inline-flex items-center gap-1 text-xs font-bold hover:underline" style={{ color: "var(--brand)" }}>
          <ArrowLeft size={12} /> Back to Companies
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6" style={{ color: "var(--text-primary)" }}>
      <div className="mx-auto max-w-screen-xl space-y-6">

        {/* Navigation back */}
        <Link
          to={`/companies/${company.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold transition hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={12} /> Back to {company.name} profile
        </Link>

        {/* Console Header */}
        <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-4">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="h-12 w-12 rounded-xl object-contain border p-1" style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)" }} />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-600/30">
                <Building2 size={20} className="text-indigo-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-black tracking-tight flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                {company.name} Admin Portal
                <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400 dark:text-indigo-300">
                  <ShieldCheck size={10} /> Global Scope
                </span>
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Configure access permissions and audit recruitment pipeline statistics.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                companyQuery.refetch();
                statsQuery.refetch();
                adminsQuery.refetch();
                recruitersQuery.refetch();
                companyJobsQuery.refetch();
              }}
              className="btn-secondary text-xs"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Sync Data
            </button>
          </div>
        </div>

        {/* Layout Panels */}
        <div className="flex flex-col gap-6 md:flex-row">
          
          {/* Sidebar Nav */}
          <div className="w-full shrink-0 md:w-48">
            <nav className="flex flex-row overflow-x-auto gap-1 border-b pb-2 md:flex-col md:border-none md:pb-0 md:space-y-1" style={{ borderColor: "var(--border)" }}>
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setActiveTab(id); setShowAddForm(false); setManagedJobId(null); }}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap md:whitespace-normal
                    ${activeTab === id
                      ? "bg-indigo-600/10 text-indigo-600 border border-indigo-600/20 dark:text-indigo-400"
                      : "border border-transparent hover:bg-[var(--bg-surface-2)]"
                    }`}
                  style={activeTab !== id ? { color: "var(--text-muted)" } : {}}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main View Panel */}
          <div className="flex-1 min-w-0">
            {activeTab === "overview" && <OverviewSection stats={stats} />}

            {activeTab === "managers" && (
              <TeamSection
                globalAdmins={globalAdmins}
                officeManagers={officeManagers}
                showAddForm={showAddForm}
                setShowAddForm={setShowAddForm}
                targetUserId={targetUserId}
                setTargetUserId={setTargetUserId}
                targetUserLabel={targetUserLabel}
                setTargetUserLabel={setTargetUserLabel}
                officeCity={officeCity}
                setOfficeCity={setOfficeCity}
                onAddManager={handleAddManager}
                onRevokeManager={(userId, city, label) => setConfirmAction({
                  type: "revoke_manager",
                  userId,
                  label,
                  officeCity: city
                })}
              />
            )}

            {activeTab === "recruiters" && (
              <MembersSection
                recruiters={recruiters}
                showAddForm={showAddForm}
                setShowAddForm={setShowAddForm}
                targetUserId={targetUserId}
                setTargetUserId={setTargetUserId}
                targetUserLabel={targetUserLabel}
                setTargetUserLabel={setTargetUserLabel}
                recruiterTitle={recruiterTitle}
                setRecruiterTitle={setRecruiterTitle}
                onAddRecruiter={handleAddRecruiter}
                onRevokeRecruiter={(userId, label) => setConfirmAction({
                  type: "revoke_recruiter",
                  userId,
                  label
                })}
              />
            )}

            {activeTab === "jobs" && (
              <JobsSection
                jobs={companyJobsQuery.data?.jobs || []}
                isLoading={companyJobsQuery.isLoading}
                managedJobId={managedJobId}
                onManageJobId={setManagedJobId}
                jobPage={jobPage}
                setJobPage={setJobPage}
                totalPages={companyJobsQuery.data?.totalPages || 1}
              />
            )}

            {activeTab === "offices" && isGlobalAdmin && (
              <OfficesSection
                offices={company.offices || []}
                admins={admins}
                showAddForm={showAddForm}
                setShowAddForm={setShowAddForm}
                officeName={officeName}
                setOfficeName={setOfficeName}
                officeCityInput={officeCityInput}
                setOfficeCityInput={setOfficeCityInput}
                officeAddress={officeAddress}
                setOfficeAddress={setOfficeAddress}
                officeManagerId={officeManagerId}
                setOfficeManagerId={setOfficeManagerId}
                submittingOffice={submittingOffice}
                onCreateOffice={handleCreateOffice}
              />
            )}

            {activeTab === "departments" && isGlobalAdmin && (
              <DepartmentsSection
                departments={company.departments || []}
                showAddForm={showAddForm}
                setShowAddForm={setShowAddForm}
                deptName={deptName}
                setDeptName={setDeptName}
                deptCode={deptCode}
                setDeptCode={setDeptCode}
                submittingDept={submittingDept}
                onCreateDept={handleCreateDept}
              />
            )}

            {activeTab === "settings" && isGlobalAdmin && (
              <SettingsSection
                settingsForm={settingsForm}
                onUpdateSetting={updateSetting}
                onLogoUpload={handleLogoUpload}
                uploadingLogo={uploadingLogo}
                onCoverUpload={handleCoverUpload}
                uploadingCover={uploadingCover}
                onSubmitSettings={handleSettingsSubmit}
                isPending={isPending}
              />
            )}
          </div>

        </div>

      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction?.type === "assign_manager" ? "Assign Office Manager" :
          confirmAction?.type === "revoke_manager" ? "Revoke Office Scope" :
          confirmAction?.type === "assign_recruiter" ? "Add Recruiter Seat" : "Revoke Recruiter Seat"
        }
        message={
          confirmAction?.type === "assign_manager" ? (
            <p>Are you sure you want to assign <strong>{confirmAction.label}</strong> as Manager for the <strong>{confirmAction.officeCity}</strong> office? They will receive a notification.</p>
          ) : confirmAction?.type === "revoke_manager" ? (
            <p>Revoke office manager privileges from <strong>{confirmAction.label}</strong> for the <strong>{confirmAction.officeCity}</strong> office?</p>
          ) : confirmAction?.type === "assign_recruiter" ? (
            <p>Are you sure you want to assign recruiter seat to <strong>{confirmAction.label}</strong> as <strong>{confirmAction.recruiterTitle}</strong>? They will receive a notification.</p>
          ) : (
            <p>Revoke recruiter privileges from <strong>{confirmAction?.label}</strong>? They will no longer be able to post jobs.</p>
          )
        }
        confirmLabel={
          confirmAction?.type === "assign_manager" || confirmAction?.type === "assign_recruiter" ? "Assign Seat" : "Revoke"
        }
        variant={confirmAction?.type?.startsWith("revoke") ? "danger" : "default"}
        isPending={isPending}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />

    </div>
  );
}
