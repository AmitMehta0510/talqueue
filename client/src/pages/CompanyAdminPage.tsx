import { useState, useMemo, FormEvent, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Building2, Users, Briefcase, Shield, ShieldCheck, Plus, Trash2, MapPin, Loader2,
  TrendingUp, ArrowLeft, RefreshCw, Sparkles, UserPlus, Info, CheckCircle2, ChevronRight, X, Settings
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { api } from "../lib/api";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Avatar } from "../components/ui";
import { userName } from "../lib/format";
import { UserSearchAutocomplete } from "./AdminPages/shared";
import { KanbanPipeline } from "../components/recruiter/KanbanPipeline";
import { useFileUpload } from "../hooks/useFileUpload";
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
      // Refetch stats and panels
      statsQuery.refetch();
    } catch { /* shows query error toast */ }
    finally {
      setConfirmAction(null);
    }
  };

  const handleAddManagerSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim() || !companyId) return;

    setConfirmAction({
      type: "assign_manager",
      userId: targetUserId.trim(),
      label: targetUserLabel || targetUserId.trim(),
      officeCity: officeCity.trim() || undefined
    });

    // Reset inputs
    setTargetUserId("");
    setTargetUserLabel("");
    setOfficeCity("");
    setShowAddForm(false);
  };

  const handleAddRecruiterSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim() || !companyId) return;

    setConfirmAction({
      type: "assign_recruiter",
      userId: targetUserId.trim(),
      label: targetUserLabel || targetUserId.trim(),
      recruiterTitle: recruiterTitle.trim() || undefined
    });

    // Reset inputs
    setTargetUserId("");
    setTargetUserLabel("");
    setRecruiterTitle("");
    setShowAddForm(false);
  };

  const loading =
    companyQuery.isFetching ||
    statsQuery.isFetching ||
    adminsQuery.isFetching ||
    recruitersQuery.isFetching ||
    companyJobsQuery.isFetching;

  if (companyQuery.isLoading || (companyId && statsQuery.isLoading)) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 bg-zinc-950 text-zinc-400">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
        <p className="text-sm font-semibold">Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (companyQuery.isError || !company || statsQuery.isError || !stats) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center mt-20 text-zinc-100">
        <Shield size={36} className="mx-auto text-rose-500 mb-3" />
        <h3 className="font-bold text-lg">Access Denied / Load Failed</h3>
        <p className="text-sm text-zinc-500 mt-2 mb-4">
          You must be a Global Administrator of the company to view this dashboard, or the server failed to respond.
        </p>
        <Link to="/companies" className="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold hover:underline">
          <ArrowLeft size={12} /> Back to Companies
        </Link>
      </div>
    );
  }

  // Render Visual Pipeline Funnel
  const pipelineStatuses = ["APPLIED", "VIEWED", "SHORTLISTED", "INTERVIEW", "REJECTED", "HIRED"];
  const pipelineCounts = stats.pipeline || [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-6">
      <div className="mx-auto max-w-screen-xl space-y-6">

        {/* ── Navigation back ── */}
        <Link
          to={`/companies/${company.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition"
        >
          <ArrowLeft size={12} /> Back to {company.name} profile
        </Link>

        {/* ── Console Header ── */}
        <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="h-12 w-12 rounded-xl object-contain bg-zinc-900 border border-zinc-800 p-1" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-600/30">
                <Building2 size={20} className="text-indigo-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                {company.name} Admin Portal
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  <ShieldCheck size={10} /> Global Scope
                </span>
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">Configure access permissions and audit recruitment pipeline statistics.</p>
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
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-700 transition"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Sync Data
            </button>
          </div>
        </div>

        {/* ── Layout Panels ── */}
        <div className="flex flex-col gap-6 md:flex-row">
          
          {/* ── Sidebar Nav ── */}
          <div className="w-full shrink-0 md:w-48">
            <nav className="flex flex-row overflow-x-auto gap-1 border-b border-zinc-800 pb-2 md:flex-col md:border-none md:pb-0 md:space-y-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setActiveTab(id); setShowAddForm(false); setManagedJobId(null); }}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap md:whitespace-normal
                    ${activeTab === id
                      ? "bg-emerald-600/10 text-emerald-400 border border-emerald-600/20"
                      : "text-zinc-500 hover:bg-zinc-900/60 hover:text-zinc-300 border border-transparent"
                    }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Main View Panel ── */}
          <div className="flex-1 min-w-0">

            {/* ── VIEW: OVERVIEW/FUNNEL ── */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                
                {/* Metrics Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Job Postings", value: stats.jobsCount, icon: Briefcase, color: "from-blue-500/20 to-indigo-500/20 text-blue-400" },
                    { label: "Pipeline Applicants", value: stats.applicantsCount, icon: Users, color: "from-purple-500/20 to-violet-500/20 text-purple-400" },
                    { label: "Office Scopes", value: stats.officeManagersCount, icon: MapPin, color: "from-amber-500/20 to-orange-500/20 text-amber-400" },
                    { label: "Recruiter Seats", value: stats.recruitersCount, icon: Shield, color: "from-emerald-500/20 to-teal-500/20 text-emerald-400" }
                  ].map((m, idx) => (
                    <div key={idx} className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition-all duration-300 hover:border-zinc-700">
                      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${m.color}`}>
                        <m.icon size={16} />
                      </div>
                      <div className="text-2xl font-black text-white">{m.value}</div>
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1">{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Pipeline Funnel Visualizer */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-6">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Sparkles size={14} className="text-emerald-400" />
                        Recruitment Pipeline Funnel
                      </h3>
                      <p className="text-[11px] text-zinc-550 mt-0.5">Visual stage-by-stage conversion analysis of current job applications.</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-rose-500/5 border border-rose-500/10 px-3 py-1.5 text-xs text-rose-400">
                      <span className="font-black">{pipelineCounts.find((p: any) => p.status === "REJECTED")?.count || 0}</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Rejected / Drop-offs</span>
                    </div>
                  </div>

                  {/* Funnel Stepper Flow */}
                  <div className="grid gap-4 md:grid-cols-5">
                    {(() => {
                      const funnelOrder = ["APPLIED", "VIEWED", "SHORTLISTED", "INTERVIEW", "HIRED"];
                      return funnelOrder.map((status, index) => {
                        const count = pipelineCounts.find((p: any) => p.status === status)?.count || 0;
                        const prevStatus = index > 0 ? funnelOrder[index - 1] : null;
                        const prevCount = prevStatus ? (pipelineCounts.find((p: any) => p.status === prevStatus)?.count || 0) : 0;
                        
                        // Calculate percentage of total applied
                        const totalApplied = pipelineCounts.find((p: any) => p.status === "APPLIED")?.count || 0;
                        const pctOfTotal = totalApplied > 0 ? Math.round((count / totalApplied) * 100) : 0;

                        // Calculate conversion from previous stage
                        const stepConversion = prevCount > 0 ? Math.round((count / prevCount) * 100) : 100;

                        return (
                          <div key={status} className="relative flex flex-col justify-between rounded-xl border border-zinc-850 bg-zinc-900/20 p-4 transition hover:border-zinc-700">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${
                                  status === "HIRED" ? "text-emerald-400" :
                                  status === "INTERVIEW" ? "text-amber-400" :
                                  status === "SHORTLISTED" ? "text-indigo-400" : "text-zinc-500"
                                }`}>
                                  Stage {index + 1}: {status}
                                </span>
                              </div>
                              <div className="mt-3 flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-white">{count}</span>
                                <span className="text-[10px] text-zinc-550 font-medium">candidates</span>
                              </div>
                            </div>

                            <div className="mt-4 space-y-1.5">
                              {/* Progress bar */}
                              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    status === "HIRED" ? "bg-gradient-to-r from-emerald-500 to-teal-400" :
                                    status === "INTERVIEW" ? "bg-amber-500" :
                                    status === "SHORTLISTED" ? "bg-indigo-500" : "bg-zinc-600"
                                  }`}
                                  style={{ width: `${pctOfTotal}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[9px] font-bold text-zinc-550">
                                <span>{pctOfTotal}% of total</span>
                                {index > 0 && (
                                  <span className="text-emerald-500">
                                    ↑ {stepConversion}% conv.
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Recent Jobs */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Recent Postings</h3>
                    {stats.recentJobs?.length === 0 ? (
                      <p className="text-xs text-zinc-600 italic">No jobs posted yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {stats.recentJobs?.map((job: any) => (
                          <div key={job.id} className="flex items-center justify-between rounded-lg border border-zinc-900 bg-zinc-900/20 p-3">
                            <div>
                              <div className="text-xs font-semibold text-white">{job.title}</div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">{job.location || "Remote"} · {job.type}</div>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                              {job._count?.applications} applicants
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Applicants */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Recent Applications</h3>
                    {stats.recentApplicants?.length === 0 ? (
                      <p className="text-xs text-zinc-600 italic">No applications received yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {stats.recentApplicants?.map((app: any) => {
                          const u = app.applicant;
                          const label = userName(u);
                          return (
                            <div key={app.id} className="flex items-center justify-between rounded-lg border border-zinc-900 bg-zinc-900/20 p-3">
                              <div className="flex items-center gap-2">
                                <Avatar user={u} size="sm" />
                                <div>
                                  <div className="text-xs font-semibold text-white">{label}</div>
                                  <div className="text-[10px] text-zinc-500 mt-0.5">Applied for {app.job?.title}</div>
                                </div>
                              </div>
                              <span className="text-[9px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                                {app.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* ── VIEW: OFFICE MANAGERS ── */}
            {activeTab === "managers" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Office Scope managers</h2>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-600/20 transition"
                  >
                    <Plus size={12} /> Assign Manager
                  </button>
                </div>

                {showAddForm && (
                  <form onSubmit={handleAddManagerSubmit} className="rounded-xl border border-emerald-600/20 bg-zinc-900/60 p-4 space-y-3">
                    <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <UserPlus size={13} className="text-emerald-500" />
                      Add Office Manager
                    </div>

                    <UserSearchAutocomplete
                      value={targetUserId}
                      onChange={(userId, label) => {
                        setTargetUserId(userId);
                        setTargetUserLabel(label);
                      }}
                      placeholder="Search users on platform..."
                    />

                    <input
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition"
                      value={officeCity}
                      onChange={(e) => setOfficeCity(e.target.value)}
                      placeholder="Office City Scope (e.g. Bangalore, London) *"
                      required
                    />

                    <div className="flex gap-2">
                      <button className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition" type="submit">
                        Assign Manager
                      </button>
                      <button type="button" className="rounded-lg border border-zinc-800 px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  {/* Global Admins read-only preview */}
                  {globalAdmins.length > 0 && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
                      <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                        <ShieldCheck size={11} />
                        Global Admins ({globalAdmins.length})
                      </div>
                      {globalAdmins.map((admin: any) => {
                        const u = admin.user;
                        const label = userName(u);
                        return (
                          <div key={admin.id} className="flex items-center justify-between border-b border-zinc-850 pb-2 last:border-b-0 last:pb-0">
                            <div className="flex items-center gap-2">
                              <Avatar user={u} size="sm" />
                              <div>
                                <div className="text-xs font-semibold text-white">{label}</div>
                                <div className="text-[10px] text-zinc-550">@{u.username}</div>
                              </div>
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              Global Privileges
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Scoped Managers */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Office Scope Managers ({officeManagers.length})</h3>
                    {officeManagers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl p-8 text-center bg-zinc-900/10">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500 mb-3">
                          <MapPin size={18} />
                        </div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">No Office-Scoped Managers</h4>
                        <p className="text-[11px] text-zinc-550 max-w-xs mt-1.5 mb-4">
                          Assign managers to specific office locations (e.g. Bangalore, London) to distribute moderation and recruiter invitation privileges.
                        </p>
                        <button
                          onClick={() => setShowAddForm(true)}
                          className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition"
                        >
                          Assign First Manager
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {officeManagers.map((admin: any) => {
                          const u = admin.user;
                          const label = userName(u);
                          return (
                            <div key={admin.id} className="flex items-center justify-between rounded-lg border border-zinc-850 bg-zinc-900/40 p-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar user={u} size="sm" />
                                <div>
                                  <div className="text-xs font-semibold text-white">{label}</div>
                                  <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                                    <span>@{u.username}</span>
                                    <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1 py-0.2 text-[8px] font-bold text-amber-400">
                                      📍 {admin.officeCity}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => setConfirmAction({
                                  type: "revoke_manager",
                                  userId: u.id,
                                  label,
                                  officeCity: admin.officeCity
                                })}
                                className="rounded p-1.5 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                              >
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
            )}

            {/* ── VIEW: RECRUITERS ── */}
            {activeTab === "recruiters" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Recruiter Seats</h2>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-600/20 transition"
                  >
                    <Plus size={12} /> Add Recruiter
                  </button>
                </div>

                {showAddForm && (
                  <form onSubmit={handleAddRecruiterSubmit} className="rounded-xl border border-emerald-600/20 bg-zinc-900/60 p-4 space-y-3">
                    <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <UserPlus size={13} className="text-emerald-500" />
                      Add Recruiter Seat
                    </div>

                    <UserSearchAutocomplete
                      value={targetUserId}
                      onChange={(userId, label) => {
                        setTargetUserId(userId);
                        setTargetUserLabel(label);
                      }}
                      placeholder="Search users on platform..."
                    />

                    <input
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition"
                      value={recruiterTitle}
                      onChange={(e) => setRecruiterTitle(e.target.value)}
                      placeholder="Job Title (e.g. Technical Recruiter, Talent Acquisition) *"
                      required
                    />

                    <div className="flex gap-2">
                      <button className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition" type="submit">
                        Assign Seat
                      </button>
                      <button type="button" className="rounded-lg border border-zinc-800 px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Assigned Seats ({recruiters.length})</h3>
                  {recruiters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl p-8 text-center bg-zinc-900/10">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500 mb-3">
                        <Users size={18} />
                      </div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">No Recruiters Assigned</h4>
                      <p className="text-[11px] text-zinc-550 max-w-xs mt-1.5 mb-4">
                        Add recruiter seats to allocate licenses for members of your talent acquisition team so they can post jobs and view candidate profiles.
                      </p>
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition"
                      >
                        Add First Recruiter
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {recruiters.map((rec: any) => {
                        const u = rec.user;
                        const label = userName(u);
                        return (
                          <div key={rec.id} className="flex items-center justify-between rounded-lg border border-zinc-850 bg-zinc-900/40 p-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar user={u} size="sm" />
                              <div>
                                <div className="text-xs font-semibold text-white">{label}</div>
                                <div className="text-[10px] text-zinc-500">{rec.title || "Recruiter"} · @{u.username}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => setConfirmAction({
                                type: "revoke_recruiter",
                                userId: u.id,
                                label
                              })}
                              className="rounded p-1.5 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── VIEW: JOBS DIRECTORY ── */}
            {activeTab === "jobs" && (
              managedJobId ? (
                <div className="space-y-4 rounded-xl border border-zinc-800 bg-white p-5 text-zinc-950">
                  <KanbanPipeline jobId={managedJobId} onBack={() => setManagedJobId(null)} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Jobs Postings</h2>
                    <Link
                      to="/jobs"
                      className="flex items-center gap-1 rounded-lg bg-emerald-600/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-600/20 transition"
                    >
                      Open Jobs Portal
                    </Link>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">All Company Job Postings</h3>
                    {companyJobsQuery.isLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-emerald-500" size={20} />
                      </div>
                    ) : !companyJobsQuery.data || companyJobsQuery.data.jobs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl p-8 text-center bg-zinc-900/10">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500 mb-3">
                          <Briefcase size={18} />
                        </div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">No Job Postings Found</h4>
                        <p className="text-[11px] text-zinc-550 max-w-xs mt-1.5 mb-4">
                          Once recruiters from your company post open roles, they will appear here along with live candidate counts.
                        </p>
                        <Link
                          to="/jobs"
                          className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition"
                        >
                          Go to Jobs Hub
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {companyJobsQuery.data.jobs.map((job: any) => (
                            <div key={job.id} className="flex items-center justify-between rounded-lg border border-zinc-850 bg-zinc-900/40 p-4">
                              <div>
                                <div className="text-xs font-bold text-white flex items-center gap-2">
                                  {job.title}
                                  <span className="inline-flex rounded bg-emerald-500/10 px-1.5 py-0.2 text-[8px] font-bold text-emerald-400">
                                    {job.status || "OPEN"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-550 mt-1">
                                  {job.location || "Remote"} · {job.type} · Posted {new Date(job.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              
                              <button
                                onClick={() => setManagedJobId(job.id)}
                                className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-0.5"
                              >
                                Manage <ChevronRight size={12} />
                              </button>
                            </div>
                          ))}
                        </div>

                        {companyJobsQuery.data.totalPages > 1 && (
                          <div className="flex items-center justify-between border-t border-zinc-800 pt-4 mt-4 text-xs">
                            <div className="text-zinc-500">
                              Showing page <span className="font-bold text-zinc-350">{jobPage}</span> of{" "}
                              <span className="font-bold text-zinc-350">{companyJobsQuery.data.totalPages}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setJobPage((p) => Math.max(1, p - 1))}
                                disabled={jobPage === 1}
                                className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 font-bold text-zinc-350 hover:border-zinc-750 disabled:opacity-40 disabled:pointer-events-none transition"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => setJobPage((p) => Math.min(companyJobsQuery.data.totalPages, p + 1))}
                                disabled={jobPage === companyJobsQuery.data.totalPages}
                                className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 font-bold text-zinc-350 hover:border-zinc-750 disabled:opacity-40 disabled:pointer-events-none transition"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            )}

            {/* ── VIEW: MANAGE OFFICES ── */}
            {activeTab === "offices" && isGlobalAdmin && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Manage Office Locations</h2>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-600/20 transition"
                  >
                    <Plus size={12} /> Add Office
                  </button>
                </div>

                {showAddForm && (
                  <form
                    onSubmit={async (e) => {
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
                    }}
                    className="rounded-xl border border-emerald-600/20 bg-zinc-900/60 p-5 space-y-4 max-w-lg"
                  >
                    <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <MapPin size={13} className="text-emerald-500" />
                      Add New Office Location
                    </div>

                    <div className="space-y-3">
                      <input
                        className="w-full rounded-lg border border-zinc-805 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition"
                        placeholder="Office Name (e.g. Headquarters, Engineering Hub) *"
                        value={officeName}
                        onChange={(e) => setOfficeName(e.target.value)}
                        required
                      />

                      <input
                        className="w-full rounded-lg border border-zinc-805 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition"
                        placeholder="City (e.g. Bangalore, San Francisco) *"
                        value={officeCityInput}
                        onChange={(e) => setOfficeCityInput(e.target.value)}
                        required
                      />

                      <input
                        className="w-full rounded-lg border border-zinc-805 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition"
                        placeholder="Address (optional)"
                        value={officeAddress}
                        onChange={(e) => setOfficeAddress(e.target.value)}
                      />

                      <select
                        className="w-full rounded-lg border border-zinc-805 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400 focus:border-emerald-500 focus:outline-none transition"
                        value={officeManagerId}
                        onChange={(e) => setOfficeManagerId(e.target.value)}
                      >
                        <option value="">-- Assign Manager (Optional) --</option>
                        {admins.map((adm: any) => (
                          <option key={adm.user?.id} value={adm.user?.id}>
                            {adm.user?.profile?.fullName || adm.user?.username} ({adm.officeCity || "Global"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={submittingOffice}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-505 transition flex items-center gap-1.5"
                      >
                        {submittingOffice && <Loader2 size={12} className="animate-spin" />}
                        Create Office
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-zinc-805 px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition"
                        onClick={() => setShowAddForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Offices List */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {(company.offices || []).length === 0 ? (
                    <div className="col-span-2 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl p-8 text-center bg-zinc-900/10">
                      <MapPin size={24} className="text-zinc-500 mb-2" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">No Offices Registered</h4>
                      <p className="text-[11px] text-zinc-500 max-w-xs mt-1">
                        Register office locations to distribute regional candidate hiring coordinates and site allocations.
                      </p>
                    </div>
                  ) : (
                    company.offices?.map((office: any) => (
                      <div key={office.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Building2 size={13} className="text-zinc-500" />
                            {office.name}
                          </h4>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {office.city}
                          </span>
                        </div>
                        {office.address && (
                          <p className="text-[10px] text-zinc-500">{office.address}</p>
                        )}
                        {office.managerId && (
                          <div className="text-[10px] text-zinc-400 border-t border-zinc-850 pt-2 flex items-center gap-1">
                            <span>Manager Assigned</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── VIEW: DEPARTMENTS ── */}
            {activeTab === "departments" && isGlobalAdmin && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Manage Departments</h2>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-600/20 transition"
                  >
                    <Plus size={12} /> Add Department
                  </button>
                </div>

                {showAddForm && (
                  <form
                    onSubmit={async (e) => {
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
                    }}
                    className="rounded-xl border border-emerald-600/20 bg-zinc-900/60 p-5 space-y-4 max-w-lg"
                  >
                    <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <Building2 size={13} className="text-emerald-500" />
                      Add New Brand Department
                    </div>

                    <div className="space-y-3">
                      <input
                        className="w-full rounded-lg border border-zinc-805 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition"
                        placeholder="Department Name (e.g. Engineering, Sales, Human Resources) *"
                        value={deptName}
                        onChange={(e) => setDeptName(e.target.value)}
                        required
                      />

                      <input
                        className="w-full rounded-lg border border-zinc-805 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition"
                        placeholder="Department Code (e.g. ENG, HR)"
                        value={deptCode}
                        onChange={(e) => setDeptCode(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={submittingDept}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-550 transition flex items-center gap-1.5"
                      >
                        {submittingDept && <Loader2 size={12} className="animate-spin" />}
                        Create Department
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-zinc-805 px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition"
                        onClick={() => setShowAddForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Departments List */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {(company.departments || []).length === 0 ? (
                    <div className="col-span-2 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl p-8 text-center bg-zinc-900/10">
                      <Building2 size={24} className="text-zinc-500 mb-2" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">No Departments Registered</h4>
                      <p className="text-[11px] text-zinc-500 max-w-xs mt-1">
                        Define internal company units to structure job post routing and employee team mappings.
                      </p>
                    </div>
                  ) : (
                    company.departments?.map((dept: any) => (
                      <div key={dept.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Building2 size={13} className="text-zinc-500" />
                            {dept.name}
                          </h4>
                          {dept.code && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              {dept.code}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "settings" && isGlobalAdmin && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider text-zinc-400">
                    <Settings size={14} className="text-emerald-500" />
                    Company Profile Settings
                  </h2>
                  <p className="text-[11px] text-zinc-550 mt-0.5">Update branding details, media covers, and recruitment coordinates.</p>
                </div>

                <form onSubmit={handleSettingsSubmit} className="space-y-6">
                  {/* Media Uploads Section */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Logo Picker */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Company Logo</label>
                      <div className="flex items-center gap-4">
                        {settingsForm.logoUrl ? (
                          <img src={settingsForm.logoUrl} alt="Logo" className="h-16 w-16 rounded-xl object-contain bg-zinc-950 border border-zinc-800 p-1" />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-600/30">
                            <Building2 size={24} className="text-indigo-400" />
                          </div>
                        )}
                        <label className="relative cursor-pointer rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition">
                          {uploadingLogo ? (
                            <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin text-emerald-400" /> Uploading...</span>
                          ) : (
                            "Choose Logo"
                          )}
                          <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo || isPending} className="hidden" />
                        </label>
                      </div>
                      <p className="text-[10px] text-zinc-500">Supported formats: JPG, PNG, GIF. Max file size: 2MB.</p>
                    </div>

                    {/* Cover Image Picker */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Cover Banner</label>
                      <div className="flex flex-col gap-3">
                        {settingsForm.coverImageUrl ? (
                          <img src={settingsForm.coverImageUrl} alt="Cover" className="h-16 w-full rounded-xl object-cover border border-zinc-800" />
                        ) : (
                          <div className="h-16 w-full rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-700/20 border border-indigo-600/30 flex items-center justify-center text-xs text-indigo-400 font-semibold">
                            No Cover Banner Uploaded
                          </div>
                        )}
                        <label className="self-start relative cursor-pointer rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition">
                          {uploadingCover ? (
                            <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin text-emerald-400" /> Uploading...</span>
                          ) : (
                            "Choose Cover Banner"
                          )}
                          <input type="file" accept="image/*" onChange={handleCoverUpload} disabled={uploadingCover || isPending} className="hidden" />
                        </label>
                      </div>
                      <p className="text-[10px] text-zinc-500">Aspect ratio: 4:1 recommended. Supported formats: JPG, PNG.</p>
                    </div>
                  </div>

                  {/* Details Form Grid */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Company Name *</span>
                        <input className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-650 focus:border-emerald-500 focus:outline-none transition" value={settingsForm.name} onChange={(e) => updateSetting("name", e.target.value)} required />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Tagline</span>
                        <input className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-650 focus:border-emerald-500 focus:outline-none transition" value={settingsForm.tagline} onChange={(e) => updateSetting("tagline", e.target.value)} placeholder="e.g. Elevating engineering collaboration" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Founded Year</span>
                        <input type="number" min={1800} max={new Date().getFullYear()} className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-650 focus:border-emerald-500 focus:outline-none transition" value={settingsForm.foundedYear} onChange={(e) => updateSetting("foundedYear", e.target.value)} placeholder="e.g. 2015" />
                      </label>
                    </div>

                    <label className="block">
                      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Description</span>
                      <textarea className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-650 focus:border-emerald-500 focus:outline-none transition min-h-24 resize-none" value={settingsForm.description} onChange={(e) => updateSetting("description", e.target.value)} placeholder="Tell candidates about your company's mission and engineering culture..." />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Industry</span>
                        <input className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-650 focus:border-emerald-500 focus:outline-none transition" value={settingsForm.industry} onChange={(e) => updateSetting("industry", e.target.value)} placeholder="e.g. Fintech, Healthcare" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Headquarters City</span>
                        <input className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-650 focus:border-emerald-500 focus:outline-none transition" value={settingsForm.headquarters} onChange={(e) => updateSetting("headquarters", e.target.value)} placeholder="e.g. Bangalore, SF" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Company Type</span>
                        <select className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400 focus:border-emerald-500 focus:outline-none transition" value={settingsForm.type} onChange={(e) => updateSetting("type", e.target.value)}>
                          <option value="">Select Type</option>
                          <option value="STARTUP">Startup</option>
                          <option value="PRODUCT_BASED">Product Based</option>
                          <option value="SERVICE_BASED">Service Based</option>
                          <option value="ENTERPRISE">Enterprise</option>
                          <option value="MNC">MNC</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Company Size</span>
                        <select className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400 focus:border-emerald-500 focus:outline-none transition" value={settingsForm.size} onChange={(e) => updateSetting("size", e.target.value)}>
                          <option value="">Select Size</option>
                          <option value="SOLO">Solo (1)</option>
                          <option value="SMALL">Small (2-49)</option>
                          <option value="MEDIUM">Medium (50-249)</option>
                          <option value="LARGE">Large (250-999)</option>
                          <option value="ENTERPRISE">Enterprise (1000+)</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Website Link</span>
                        <input type="url" className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-650 focus:border-emerald-500 focus:outline-none transition" value={settingsForm.websiteUrl} onChange={(e) => updateSetting("websiteUrl", e.target.value)} placeholder="https://company.com" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Careers Page Link</span>
                        <input type="url" className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-650 focus:border-emerald-500 focus:outline-none transition" value={settingsForm.careersPageUrl} onChange={(e) => updateSetting("careersPageUrl", e.target.value)} placeholder="https://company.com/careers" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">GitHub Org Link</span>
                        <input type="url" className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-650 focus:border-emerald-500 focus:outline-none transition" value={settingsForm.githubUrl} onChange={(e) => updateSetting("githubUrl", e.target.value)} placeholder="https://github.com/org" />
                      </label>
                    </div>

                    <div className="flex gap-6 text-xs text-zinc-400 pt-2 border-t border-zinc-850">
                      <label className="flex cursor-pointer items-center gap-2 select-none">
                        <input type="checkbox" checked={settingsForm.hiringEnabled} onChange={(e) => updateSetting("hiringEnabled", e.target.checked)} className="accent-emerald-600 h-3.5 w-3.5 rounded bg-zinc-950 border-zinc-800" />
                        Hiring active
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 select-none">
                        <input type="checkbox" checked={settingsForm.referralEnabled} onChange={(e) => updateSetting("referralEnabled", e.target.checked)} className="accent-emerald-600 h-3.5 w-3.5 rounded bg-zinc-950 border-zinc-800" />
                        Referral coordinates open
                      </label>
                    </div>
                  </div>

                  {/* Actions Submit */}
                  <div className="flex gap-2 justify-end border-t border-zinc-850 pt-4">
                    <button
                      type="submit"
                      disabled={isPending || uploadingLogo || uploadingCover}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white px-5 py-2.5 text-xs transition duration-200 shadow-md disabled:opacity-50 disabled:pointer-events-none hover:scale-102"
                    >
                      {updateCompanyMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                      Save Profile Changes
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>


        </div>

      </div>

      {/* ── Confirmation Dialog ── */}
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
