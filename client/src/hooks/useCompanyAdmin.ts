import { useState, useMemo, FormEvent, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../core/contexts/AuthContext";
import { useToast } from "../core/contexts/ToastContext";
import { CompanyType, CompanySize, User } from "../core/types/models";
import { useFileUpload } from "../features/storage/hooks/useFileUpload";

export interface ManagerInfo {
  id: string;
  officeCity?: string | null;
  user: User;
}

export interface RecruiterSeat {
  id: string;
  title?: string | null;
  user: User;
}
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
} from "./usePlatformQueries";

type Tab = "overview" | "managers" | "recruiters" | "jobs" | "offices" | "departments" | "settings";

export function useCompanyAdmin() {
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
    foundedYear: "", type: "" as string, size: "" as string,
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

  const updateSetting = (key: string, value: unknown) => {
    setSettingsForm((p) => ({ ...p, [key]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadLogo(file, "avatar");
      updateSetting("logoUrl", res.fileUrl);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadCover(file, "avatar");
      updateSetting("coverImageUrl", res.fileUrl);
    } catch (err) {
      console.error(err);
    }
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
          type: settingsForm.type ? (settingsForm.type as CompanyType) : undefined,
          size: settingsForm.size ? (settingsForm.size as CompanySize) : undefined,
          hiringEnabled: settingsForm.hiringEnabled,
          referralEnabled: settingsForm.referralEnabled,
        }
      });
      showToast("success", "Company profile updated successfully!");
    } catch (err) {
      console.error(err);
    }
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

  const globalAdmins = admins.filter((a: ManagerInfo) => !a.officeCity);
  const officeManagers = admins.filter((a: ManagerInfo) => a.officeCity);

  const isGlobalAdmin = useMemo(() => {
    if (!currentUser || !companyId) return false;
    const adminship = currentUser.companyAdminships?.find(
      (a) => a.companyId === companyId
    );
    return !!adminship && (adminship.officeCity === null || adminship.officeCity === undefined);
  }, [currentUser, companyId]);

  return {
    currentUser,
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
  };
}
