import { FormEvent, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Building2, Users, Briefcase, Shield, MapPin, Loader2,
  TrendingUp, ArrowLeft, RefreshCw, Settings
} from "lucide-react";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { api } from "../../lib/api";

// Presentational Sections
import { OverviewSection } from "./OverviewSection";
import { TeamSection } from "./TeamSection";
import { MembersSection } from "./MembersSection";
import { JobsSection } from "./JobsSection";
import { OfficesSection } from "./OfficesSection";
import { DepartmentsSection } from "./DepartmentsSection";
import { SettingsSection } from "./SettingsSection";
import { useCompanyAdmin } from "../../hooks/useCompanyAdmin";

type Tab = "overview" | "managers" | "recruiters" | "jobs" | "offices" | "departments" | "settings";

export function CompanyAdminPageContent() {
  const {
    companySlug,
    activeTab,
    setActiveTab,
    jobPage,
    setJobPage,
    managedJobId,
    setManagedJobId,
    companyQuery,
    company,
    companyId,
    uploadingLogo,
    uploadingCover,
    settingsForm,
    updateSetting,
    handleLogoUpload,
    handleCoverUpload,
    handleSettingsSubmit,
    statsQuery,
    adminsQuery,
    recruitersQuery,
    companyJobsQuery,
    assignAdmin,
    removeAdmin,
    assignRecruiter,
    removeRecruiter,
    updateCompanyMutation,
    confirmAction,
    setConfirmAction,
    targetUserId,
    setTargetUserId,
    targetUserLabel,
    setTargetUserLabel,
    officeCity,
    setOfficeCity,
    recruiterTitle,
    setRecruiterTitle,
    showAddForm,
    setShowAddForm,
    officeName,
    setOfficeName,
    officeAddress,
    setOfficeAddress,
    officeCityInput,
    setOfficeCityInput,
    officeManagerId,
    setOfficeManagerId,
    submittingOffice,
    setSubmittingOffice,
    deptName,
    setDeptName,
    deptCode,
    setDeptCode,
    submittingDept,
    setSubmittingDept,
    stats,
    admins,
    recruiters,
    globalAdmins,
    officeManagers,
    isGlobalAdmin,
  } = useCompanyAdmin();

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
    companyQuery.isFetching;

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
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingDept(false);
    }
  };

  const loading =
    companyQuery.isLoading ||
    statsQuery.isLoading ||
    adminsQuery.isLoading ||
    recruitersQuery.isLoading ||
    companyJobsQuery.isLoading;

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  if (companyQuery.isError || !company) {
    return (
      <div className="panel p-8 text-center text-danger border-[color:var(--border)]">
        Failed to load company profile or slug is invalid.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button and title */}
      <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/career/companies/${companySlug}`}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-2 hover:bg-surface-3 border border-[color:var(--border)]"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-primary">{company.name} Admin Panel</h1>
            <p className="text-[10px] text-secondary mt-0.5">Control company identity, office listings, and recruiter seat licenses</p>
          </div>
        </div>

        <button
          onClick={() => {
            companyQuery.refetch();
            statsQuery.refetch();
          }}
          disabled={isPending}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-2 hover:bg-surface-3 border border-[color:var(--border)] text-secondary hover:text-primary transition"
        >
          <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[color:var(--border)] overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setShowAddForm(false);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "border-brand text-brand"
                  : "border-transparent text-secondary hover:text-primary"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
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
            onRevokeManager={(userId: string, city: string | undefined) =>
              setConfirmAction({
                type: "revoke_manager",
                userId,
                label: "this user",
                officeCity: city
              })
            }
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
            onRevokeRecruiter={(userId: string) =>
              setConfirmAction({
                type: "revoke_recruiter",
                userId,
                label: "this recruiter seat"
              })
            }
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
            isPending={updateCompanyMutation.isPending}
          />
        )}
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        title="Revoke Organization Role"
        message={`Are you sure you want to revoke ${confirmAction?.label}? This will suspend their admin access immediately.`}
        confirmLabel="Revoke"
        cancelLabel="Cancel"
        variant="danger"
        isPending={isPending}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
export default CompanyAdminPageContent;
